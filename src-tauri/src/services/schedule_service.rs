use crate::middlewares::role_guard::require_admin;
use crate::models::schedule_model::{ScheduleApiResponse, ScheduleItem, InsertJadwalRequest, InsertJadwalApiResponse, InsertJadwalResponseData};
use crate::utils::{create_http_client, log_network_error, API_BASE_URL};
use crate::{AppError, AppState};

pub async fn get_schedule_service(state: &AppState) -> Result<Vec<ScheduleItem>, AppError> {
    tracing::info!("Memulai proses pengambilan jadwal operasional...");

    // 1. Validasi Role (Middleware-style)
    let token = require_admin(state).await?;

    // 2. HTTP Request
    let client = create_http_client();
    let res = match client
        .get(&format!("{}/updates/get-jadwal", API_BASE_URL))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            log_network_error("Get Jadwal (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = res.status().as_u16();

    if !res.status().is_success() {
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal mengambil jadwal operasional")
                .to_string()
        } else {
            "Gagal mengambil jadwal operasional pada server".to_string()
        };

        tracing::error!("Gagal mengambil jadwal (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: None,
            message: error_msg,
        });
    }

    let text_res = match res.text().await {
        Ok(text) => text,
        Err(e) => {
            log_network_error("Get Jadwal (baca body)", &e);
            return Err(e.into());
        }
    };

    let api_res: ScheduleApiResponse = match serde_json::from_str(&text_res) {
        Ok(data) => data,
        Err(e) => {
            return Err(AppError::Unknown(format!(
                "Format JSON Get Jadwal tidak sesuai: {}. Raw: {}",
                e, text_res
            )));
        }
    };

    tracing::info!("Proses pengambilan jadwal operasional berhasil diselesaikan.");
    Ok(api_res.data.data)
}

pub async fn insert_jadwal_service(state: &AppState, time: String) -> Result<InsertJadwalResponseData, AppError> {
    tracing::info!("Memulai proses insert jadwal operasional...");

    // 1. Validasi Role (Middleware-style)
    let token = require_admin(state).await?;

    // 2. Persiapkan Payload Request
    let payload = InsertJadwalRequest { time };

    // 3. HTTP Request
    let client = create_http_client();
    let res = match client
        .post(&format!("{}/updates/insert-jadwal", API_BASE_URL))
        .header("Authorization", format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            log_network_error("Insert Jadwal (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = res.status().as_u16();

    if !res.status().is_success() {
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal insert jadwal operasional")
                .to_string()
        } else {
            "Gagal insert jadwal operasional pada server".to_string()
        };

        tracing::error!("Gagal insert jadwal (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: None,
            message: error_msg,
        });
    }

    let text_res = match res.text().await {
        Ok(text) => text,
        Err(e) => {
            log_network_error("Insert Jadwal (baca body)", &e);
            return Err(e.into());
        }
    };

    let api_res: InsertJadwalApiResponse = match serde_json::from_str(&text_res) {
        Ok(data) => data,
        Err(e) => {
            return Err(AppError::Unknown(format!(
                "Format JSON Insert Jadwal tidak sesuai: {}. Raw: {}",
                e, text_res
            )));
        }
    };

    tracing::info!("Proses insert jadwal operasional berhasil diselesaikan.");
    Ok(api_res.data.data)
}
