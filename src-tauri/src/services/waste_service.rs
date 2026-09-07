use crate::db::waste_queries::{get_cached_catalog, upsert_catalog_item};
use crate::models::waste_model::{CatalogItemLocal, WasteCatalogApiResponse};
use crate::utils::constants::API_BASE_URL;
use crate::utils::http::create_http_client;
use crate::AppError;
use crate::AppState;
use base64::{engine::general_purpose, Engine as _};
use reqwest::header::AUTHORIZATION;

pub async fn sync_catalog_from_server(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Menarik data katalog sampah dari server...");

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/waste/catalog", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    match res {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<WasteCatalogApiResponse>().await {
                    Ok(api_response) => {
                        let items = api_response.data.data;
                        let cached_items = get_cached_catalog(&state.db, None, None).await?;

                        for server_item in items {
                            let mut current_base64 = None;

                            // Check if item exists in cache and if image matches
                            if let Some(cached) = cached_items.iter().find(|i| i.id_waste == server_item.id_waste) {
                                if cached.catalog_img == server_item.catalog_img && cached.image_base64.is_some() {
                                    current_base64 = cached.image_base64.clone();
                                }
                            }

                            // If we don't have the image yet or it changed, fetch it
                            if current_base64.is_none() {
                                if let Some(ref img) = server_item.catalog_img {
                                    let img_url = format!("{}/waste/catalog/photo/{}", API_BASE_URL, img);
                                    match client
                                        .get(&img_url)
                                        .header(AUTHORIZATION, format!("Bearer {}", token))
                                        .send()
                                        .await
                                    {
                                        Ok(img_res) if img_res.status().is_success() => {
                                            if let Ok(bytes) = img_res.bytes().await {
                                                let encoded = general_purpose::STANDARD.encode(&bytes);
                                                // Default MIME type, assuming PNG/JPEG since no extension might be known or it could be dynamically inferred, but format is specified by user as png.
                                                current_base64 = Some(format!("data:image/png;base64,{}", encoded));
                                            }
                                        }
                                        _ => {
                                            tracing::warn!("Gagal mendownload gambar katalog: {}", img);
                                        }
                                    }
                                }
                            }

                            // Save to SQLite
                            if let Err(e) = upsert_catalog_item(&state.db, &server_item, current_base64).await {
                                tracing::error!("Gagal menyimpan katalog ke SQLite: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Gagal memparsing respon JSON katalog sampah: {}", e);
                        return Err(e.into());
                    }
                }
            } else {
                tracing::warn!(
                    "API katalog merespons dengan status error: {}",
                    response.status()
                );
                return Err(AppError::ApiError {
                    http_status: response.status().as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {}", response.status()),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal mengambil katalog dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    }

    // Clean up local items that are deleted on server
    // Option: delete items from local DB that are not in the current server list

    Ok(())
}

pub async fn fetch_catalog_service(
    state: &AppState,
    search_query: Option<String>,
    category_id: Option<i64>,
) -> Result<Vec<CatalogItemLocal>, AppError> {
    tracing::info!("Mengambil data katalog sampah (Offline-First)...");

    // Jalankan Smart Sync Service
    if let Err(e) = crate::services::sync_service::run_smart_sync_service(state).await {
        tracing::warn!("Smart Sync gagal: {}. Melanjutkan dengan data cache...", e);
    }

    // Selalu kembalikan hasil dari SQLite
    get_cached_catalog(&state.db, search_query, category_id).await
}
