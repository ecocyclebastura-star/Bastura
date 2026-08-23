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
                            
                            // Download images in the background
                            for item in api_response.data {
                                if let Some(img_url) = item.data.education_img {
                                    if let Some(filename) = img_url.split('/').last() {
                                        let full_url = if img_url.starts_with("http") {
                                            img_url.clone()
                                        } else {
                                            format!("{}/education/education/photo/{}", API_BASE_URL, filename)
                                        };
                                        
                                        let _ = crate::utils::file_utils::download_and_save_image(
                                            &state.app_handle,
                                            &full_url,
                                            &token,
                                            filename
                                        ).await;
                                    }
                                }
                            }
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
    let items = get_cached_education(&state.db, &state.app_handle, search, limit).await?;

    let missing_images: Vec<_> = items.iter().filter_map(|item| {
        if item.image_base64.is_none() && item.image_url.is_some() {
            Some(item.image_url.clone().unwrap())
        } else {
            None
        }
    }).collect();

    if !missing_images.is_empty() {
        let state_clone = state.clone();
        tauri::async_runtime::spawn(async move {
            if let Ok(token) = state_clone.get_valid_token().await {
                for img_url in missing_images {
                    if let Some(filename) = img_url.split('/').last() {
                        let full_url = if img_url.starts_with("http") { img_url.clone() } else { format!("{}/education/education/photo/{}", crate::utils::constants::API_BASE_URL, filename) };
                        let _ = crate::utils::file_utils::download_and_save_image(&state_clone.app_handle, &full_url, &token, filename).await;
                    }
                }
            }
        });
    }

    Ok(items)
}
