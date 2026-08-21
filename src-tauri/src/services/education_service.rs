use reqwest::header::AUTHORIZATION;
use crate::AppState;
use crate::AppError;
use crate::models::education_model::{EducationApiResponse, EducationClientResponse};
use crate::db::education_queries::{upsert_education, get_cached_education};
use crate::utils::http::create_http_client;
use crate::utils::constants::API_BASE_URL;

pub async fn sync_education_from_server(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Menarik data edukasi dari server...");
    
    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/education/education", API_BASE_URL);
    
    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    match res {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<EducationApiResponse>().await {
                    Ok(api_response) => {
                        if let Err(e) = upsert_education(&state.db, &api_response.data).await {
                            tracing::error!("Gagal menyimpan edukasi ke SQLite: {}", e);
                            return Err(e);
                        } else {
                            tracing::info!("Berhasil menyimpan edukasi terbaru ke SQLite.");
                        }
                    }
                    Err(e) => {
                        tracing::error!("Gagal memparsing respon JSON edukasi: {}", e);
                        return Err(e.into());
                    }
                }
            } else {
                tracing::warn!("API edukasi merespons dengan status error: {}", response.status());
                return Err(AppError::ApiError {
                    http_status: response.status().as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {}", response.status())
                });
            }
        },
        Err(e) => {
            tracing::warn!("Gagal mengambil edukasi dari server (Mungkin offline): {}", e);
            return Err(e.into());
        }
    }

    Ok(())
}

pub async fn fetch_education_service(
    state: &AppState,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<EducationClientResponse>, AppError> {
    tracing::info!("Mengambil data edukasi (Offline-First)...");
    
    // Jalankan Smart Sync Service
    if let Err(e) = crate::services::sync_service::run_smart_sync_service(state).await {
        tracing::warn!("Smart Sync gagal: {}. Melanjutkan dengan data cache...", e);
    }

    // Selalu kembalikan hasil dari SQLite
    get_cached_education(&state.db, search, limit).await
}
