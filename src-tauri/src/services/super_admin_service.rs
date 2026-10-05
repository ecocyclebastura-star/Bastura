use crate::utils::constants::API_BASE_URL;
use crate::utils::error::AppError;
use crate::utils::http::create_http_client;
use crate::utils::state::AppState;
use reqwest::header::AUTHORIZATION;
use crate::models::super_admin_model::SuperAdminApiResponse;

// Helper function to validate UUID without adding external dependencies
fn is_valid_uuid(uuid: &str) -> bool {
    let uuid = uuid.trim();
    if uuid.len() != 36 {
        return false;
    }
    let parts: Vec<&str> = uuid.split('-').collect();
    if parts.len() != 5 {
        return false;
    }
    parts[0].len() == 8 &&
    parts[1].len() == 4 &&
    parts[2].len() == 4 &&
    parts[3].len() == 4 &&
    parts[4].len() == 12 &&
    uuid.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}

pub async fn promote_admin_service(
    _state: &AppState,
    token: &str,
    target_id: String,
) -> Result<(), AppError> {
    if !is_valid_uuid(&target_id) {
        return Err(AppError::ValidationError("ID tidak valid (bukan UUID)".to_string()));
    }

    let client = create_http_client();
    let res = client
        .patch(&format!("{}/admin/promote/{}", API_BASE_URL, target_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&serde_json::json!({}))
        .send()
        .await?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        match status.as_u16() {
            400 => Err(AppError::ValidationError("Validasi gagal".to_string())),
            403 => Err(AppError::Forbidden("Gagal: Anda bukan Super Admin.".to_string())),
            404 => Err(AppError::ApiError {
                http_status: 404,
                status: "Not Found".to_string(),
                code: None,
                message: "User target tidak ditemukan.".to_string(),
            }),
            409 => {
                let error_data: Option<SuperAdminApiResponse> = res.json().await.ok();
                if let Some(err) = error_data {
                    if err.code.as_deref() == Some("USER_BLOCKED") {
                        Err(AppError::ApiError {
                            http_status: 409,
                            status: "Conflict".to_string(),
                            code: Some("USER_BLOCKED".to_string()),
                            message: "Gagal: Target sedang diblokir.".to_string(),
                        })
                    } else {
                        Err(AppError::ApiError {
                            http_status: 409,
                            status: "Conflict".to_string(),
                            code: Some("CONFLICT_ROLE".to_string()),
                            message: "Gagal: User sudah menjadi Admin.".to_string(),
                        })
                    }
                } else {
                    Err(AppError::ApiError {
                        http_status: 409,
                        status: "Conflict".to_string(),
                        code: Some("CONFLICT_ROLE".to_string()),
                        message: "Gagal: User sudah menjadi Admin.".to_string(),
                    })
                }
            },
            _ => Err(AppError::Unknown("Terjadi kesalahan yang tidak terduga".to_string())),
        }
    }
}

pub async fn demote_admin_service(
    _state: &AppState,
    token: &str,
    target_id: String,
) -> Result<(), AppError> {
    if !is_valid_uuid(&target_id) {
        return Err(AppError::ValidationError("ID tidak valid (bukan UUID)".to_string()));
    }

    let client = create_http_client();
    let res = client
        .patch(&format!("{}/admin/demote/{}", API_BASE_URL, target_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&serde_json::json!({}))
        .send()
        .await?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        match status.as_u16() {
            403 => {
                let error_data: Option<SuperAdminApiResponse> = res.json().await.ok();
                if let Some(err) = error_data {
                    if err.code.as_deref() == Some("FORBIDDEN_SELF_DEMOTE") {
                        Err(AppError::Forbidden("Gagal: Tidak dapat mencabut akses diri sendiri.".to_string()))
                    } else {
                        Err(AppError::Forbidden("Gagal: Anda bukan Super Admin.".to_string()))
                    }
                } else {
                    Err(AppError::Forbidden("Gagal: Anda bukan Super Admin.".to_string()))
                }
            },
            409 => {
                Err(AppError::ApiError {
                    http_status: 409,
                    status: "Conflict".to_string(),
                    code: Some("CONFLICT_ROLE".to_string()),
                    message: "Gagal: User bukan Admin.".to_string(),
                })
            },
            _ => Err(AppError::Unknown("Terjadi kesalahan yang tidak terduga".to_string())),
        }
    }
}
