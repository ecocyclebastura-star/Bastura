use crate::middlewares::role_guard::require_super_admin;
use crate::models::commission_model::{
    CommissionDetailResponse, CommissionSummaryResponse, UpdateCommissionFeeRequest,
    UpdateCommissionFeeResponse,
};
use crate::utils::constants::API_BASE_URL;
use crate::utils::error::AppError;
use crate::utils::http::create_http_client;
use crate::utils::logger::log_network_error;
use crate::utils::state::AppState;
use reqwest::header::AUTHORIZATION;

/// Helper untuk memvalidasi format periode YYYY-MM
fn validate_periode_format(periode: &str) -> bool {
    let p = periode.trim();
    if p.len() != 7 {
        return false;
    }
    let bytes = p.as_bytes();
    if bytes[4] != b'-' {
        return false;
    }
    // 4 digit tahun
    if !bytes[0..4].iter().all(|b| b.is_ascii_digit()) {
        return false;
    }
    // 2 digit bulan (01..=12)
    if !bytes[5..7].iter().all(|b| b.is_ascii_digit()) {
        return false;
    }
    if let Ok(month) = p[5..7].parse::<u32>() {
        (1..=12).contains(&month)
    } else {
        false
    }
}

/// Mengambil ringkasan komisi dan histori bulanan (Khusus Super Admin)
pub async fn get_commission_summary_service(
    state: &AppState,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<CommissionSummaryResponse, AppError> {
    // 1. Otorisasi ketat level Rust [KOM-RUST-01]
    let token = require_super_admin(state).await?;

    let client = create_http_client();
    let url = format!("{}/komisi/summary", API_BASE_URL);

    let mut req = client.get(&url).header(AUTHORIZATION, format!("Bearer {}", token));

    if let Some(l) = limit {
        req = req.query(&[("limit", l.to_string())]);
    }
    if let Some(o) = offset {
        req = req.query(&[("offset", o.to_string())]);
    }

    let res = req.send().await.map_err(|e| {
        log_network_error("Get Ringkasan Komisi", &e);
        AppError::Network(e)
    })?;

    let status = res.status();
    if status.is_success() {
        let body_text = res.text().await.unwrap_or_default();
        let data: CommissionSummaryResponse = serde_json::from_str(&body_text).map_err(|e| {
            tracing::error!("Gagal parsing JSON Ringkasan Komisi: {}. Raw: {}", e, body_text);
            AppError::Unknown(format!("Format data ringkasan komisi tidak sesuai: {}", e))
        })?;
        Ok(data)
    } else if status.as_u16() == 403 {
        Err(AppError::Forbidden(
            "Akses ditolak: Hanya Super Admin yang dapat mengakses modul ini.".to_string(),
        ))
    } else {
        let body_text = res.text().await.unwrap_or_default();
        let body_json: Option<serde_json::Value> = serde_json::from_str(&body_text).ok();
        let msg = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or(&format!(
                "Gagal mengambil ringkasan komisi (HTTP {}).",
                status.as_u16()
            ))
            .to_string();

        Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: None,
            message: msg,
        })
    }
}

/// Mengambil rincian segmen komisi per periode YYYY-MM (Khusus Super Admin)
pub async fn get_commission_detail_service(
    state: &AppState,
    periode: String,
) -> Result<CommissionDetailResponse, AppError> {
    // 1. Otorisasi ketat level Rust [KOM-RUST-01]
    let token = require_super_admin(state).await?;

    // 2. Validasi Pra-API format periode [KOM-RUST-02]
    let trimmed_periode = periode.trim();
    if !validate_periode_format(trimmed_periode) {
        return Err(AppError::ValidationError(
            "Format periode tidak valid. Gunakan YYYY-MM.".to_string(),
        ));
    }

    let client = create_http_client();
    let url = format!("{}/komisi/detail/{}", API_BASE_URL, trimmed_periode);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| {
            log_network_error("Get Rincian Komisi", &e);
            AppError::Network(e)
        })?;

    let status = res.status();
    if status.is_success() {
        let body_text = res.text().await.unwrap_or_default();
        let data: CommissionDetailResponse = serde_json::from_str(&body_text).map_err(|e| {
            tracing::error!("Gagal parsing JSON Rincian Komisi: {}. Raw: {}", e, body_text);
            AppError::Unknown(format!("Format data rincian komisi tidak sesuai: {}", e))
        })?;
        Ok(data)
    } else if status.as_u16() == 403 {
        Err(AppError::Forbidden(
            "Akses ditolak: Hanya Super Admin yang dapat mengakses modul ini.".to_string(),
        ))
    } else if status.as_u16() == 404 {
        Err(AppError::ApiError {
            http_status: 404,
            status: "error".to_string(),
            code: None,
            message: "Data rincian komisi untuk periode tersebut tidak ditemukan.".to_string(),
        })
    } else {
        let body_text = res.text().await.unwrap_or_default();
        let body_json: Option<serde_json::Value> = serde_json::from_str(&body_text).ok();
        let msg = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or(&format!(
                "Gagal mengambil rincian komisi (HTTP {}).",
                status.as_u16()
            ))
            .to_string();

        Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: None,
            message: msg,
        })
    }
}

/// Memperbarui persentase fee komisi dengan proteksi race condition (Khusus Super Admin)
pub async fn update_commission_fee_service(
    state: &AppState,
    payload: UpdateCommissionFeeRequest,
) -> Result<UpdateCommissionFeeResponse, AppError> {
    // 1. Otorisasi ketat level Rust [KOM-RUST-01]
    let token = require_super_admin(state).await?;

    // 2. Validasi Pra-API Range Fee [KOM-RUST-03]
    let new_val = match payload.new_fee.trim().parse::<f64>() {
        Ok(v) => v,
        Err(_) => {
            return Err(AppError::ValidationError(
                "Persentase komisi baru harus berupa angka valid.".to_string(),
            ))
        }
    };
    if !(0.0..=100.0).contains(&new_val) {
        return Err(AppError::ValidationError(
            "Persentase komisi harus berada di antara 0 hingga 100.".to_string(),
        ));
    }

    let old_val = match payload.old_fee.trim().parse::<f64>() {
        Ok(v) => v,
        Err(_) => {
            return Err(AppError::ValidationError(
                "Persentase komisi lama harus berupa angka valid.".to_string(),
            ))
        }
    };
    if !(0.0..=100.0).contains(&old_val) {
        return Err(AppError::ValidationError(
            "Persentase komisi lama tidak valid.".to_string(),
        ));
    }

    let client = create_http_client();
    let url = format!("{}/komisi/fee", API_BASE_URL);

    let res = client
        .put(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            log_network_error("Update Fee Komisi", &e);
            AppError::Network(e)
        })?;

    let status = res.status();
    if status.is_success() {
        let body_text = res.text().await.unwrap_or_default();
        let resp = serde_json::from_str::<UpdateCommissionFeeResponse>(&body_text).unwrap_or(
            UpdateCommissionFeeResponse {
                status: "success".to_string(),
                message: Some("Tarif komisi berhasil diperbarui.".to_string()),
            },
        );
        Ok(resp)
    } else {
        let body_text = res.text().await.unwrap_or_default();
        let body_json: Option<serde_json::Value> = serde_json::from_str(&body_text).ok();
        let code = body_json
            .as_ref()
            .and_then(|v| v.get("code"))
            .and_then(|c| c.as_str());

        // Penanganan Race Condition 409 [KOM-RUST-04]
        if status.as_u16() == 409 || code == Some("OLD_FEE_MISMATCH") {
            return Err(AppError::ApiError {
                http_status: 409,
                status: "error".to_string(),
                code: Some("OLD_FEE_MISMATCH".to_string()),
                message: "Gagal: Data tarif di server telah berubah oleh Admin lain. Silakan refresh halaman."
                    .to_string(),
            });
        }

        if status.as_u16() == 403 {
            return Err(AppError::Forbidden(
                "Akses ditolak: Hanya Super Admin yang dapat mengakses modul ini.".to_string(),
            ));
        }

        let msg = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or(&format!(
                "Gagal memperbarui tarif komisi (HTTP {}).",
                status.as_u16()
            ))
            .to_string();

        Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: code.map(|s| s.to_string()),
            message: msg,
        })
    }
}
