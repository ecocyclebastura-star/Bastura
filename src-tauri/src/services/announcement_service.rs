use reqwest::header::AUTHORIZATION;
use crate::AppState;
use crate::AppError;
use crate::models::announcement_model::{AnnouncementApiResponse, AnnouncementClientResponse};
use crate::db::announcement_queries::{upsert_announcements, get_cached_announcements};
use crate::utils::http::create_http_client;
use crate::utils::constants::API_BASE_URL;

pub async fn sync_announcements_from_server(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Menarik data pengumuman dari server...");
    
    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/announcements/announcements", API_BASE_URL);
    
    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    match res {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<AnnouncementApiResponse>().await {
                    Ok(api_response) => {
                        if let Err(e) = upsert_announcements(&state.db, &api_response.data).await {
                            tracing::error!("Gagal menyimpan pengumuman ke SQLite: {}", e);
                            return Err(e);
                        } else {
                            tracing::info!("Berhasil menyimpan pengumuman terbaru ke SQLite.");
                        }
                    }
                    Err(e) => {
                        tracing::error!("Gagal memparsing respon JSON pengumuman: {}", e);
                        return Err(e.into());
                    }
                }
            } else {
                tracing::warn!("API pengumuman merespons dengan status error: {}", response.status());
                return Err(AppError::ApiError {
                    http_status: response.status().as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {}", response.status())
                });
            }
        },
        Err(e) => {
            tracing::warn!("Gagal mengambil pengumuman dari server (Mungkin offline): {}", e);
            return Err(e.into());
        }
    }

    Ok(())
}

pub async fn fetch_announcements_service(
    state: &AppState,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AnnouncementClientResponse>, AppError> {
    tracing::info!("Mengambil data pengumuman (Offline-First)...");
    
    // Jalankan Smart Sync Service
    if let Err(e) = crate::services::sync_service::run_smart_sync_service(state).await {
        tracing::warn!("Smart Sync gagal: {}. Melanjutkan dengan data cache...", e);
    }

    // Selalu kembalikan hasil dari SQLite
    get_cached_announcements(&state.db, search, limit).await
}
