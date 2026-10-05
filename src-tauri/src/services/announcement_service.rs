use crate::db::announcement_queries::{get_cached_announcements, upsert_announcements};
use crate::models::announcement_model::{AnnouncementApiResponse, AnnouncementClientResponse};
use crate::utils::constants::API_BASE_URL;
use crate::utils::http::create_http_client;
use crate::AppError;
use crate::AppState;
use reqwest::header::AUTHORIZATION;
use tauri::Manager;

pub async fn sync_announcements_from_server(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Menarik data pengumuman dari server...");

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/announcements", API_BASE_URL);

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

                            // Download images in the background
                            for item in api_response.data {
                                if let Some(img_url) = item.data.announcements_img {
                                    if let Some(filename) = img_url.split('/').last() {
                                        let full_url = if img_url.starts_with("http") {
                                            img_url.clone()
                                        } else {
                                            format!(
                                                "{}/announcements/photo/{}",
                                                API_BASE_URL, filename
                                            )
                                        };

                                        let _ = crate::utils::file_utils::download_and_save_image(
                                            &state.app_handle,
                                            &full_url,
                                            &token,
                                            filename,
                                        )
                                        .await;
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Gagal memparsing respon JSON pengumuman: {}", e);
                        return Err(e.into());
                    }
                }
            } else {
                tracing::warn!(
                    "API pengumuman merespons dengan status error: {}",
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
                "Gagal mengambil pengumuman dari server (Mungkin offline): {}",
                e
            );
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
    let items = get_cached_announcements(&state.db, &state.app_handle, search, limit).await?;

    let missing_images: Vec<_> = items
        .iter()
        .filter_map(|item| {
            if item.image_base64.is_none() && item.image_url.is_some() {
                Some(item.image_url.clone().unwrap())
            } else {
                None
            }
        })
        .collect();

    if !missing_images.is_empty() {
        let state_clone = state.clone();
        tauri::async_runtime::spawn(async move {
            if let Ok(token) = state_clone.get_valid_token().await {
                for img_url in missing_images {
                    if let Some(filename) = img_url.split('/').last() {
                        let full_url = if img_url.starts_with("http") {
                            img_url.clone()
                        } else {
                            format!(
                                "{}/announcements/photo/{}",
                                crate::utils::constants::API_BASE_URL,
                                filename
                            )
                        };
                        let _ = crate::utils::file_utils::download_and_save_image(
                            &state_clone.app_handle,
                            &full_url,
                            &token,
                            filename,
                        )
                        .await;
                    }
                }
            }
        });
    }

    Ok(items)
}

pub async fn add_announcement_service(
    state: &AppState,
    payload: crate::models::announcement_model::AddAnnouncementPayload,
) -> Result<String, AppError> {
    let token = crate::middlewares::role_guard::require_admin(state).await?;

    // [ANC-API-02] Validasi Format JSON Content
    if serde_json::from_str::<serde_json::Value>(&payload.content).is_err() {
        return Err(AppError::ValidationError("Format konten tidak valid.".to_string()));
    }

    let mut form = reqwest::multipart::Form::new()
        .text("title", payload.title)
        .text("content", payload.content)
        .text("category_id", payload.category_id);

    let mut image_data = None;

    if let (Some(bytes), Some(name)) = (payload.file_bytes, payload.file_name) {
        image_data = Some((bytes, name));
    } else if let Some(draft_id) = &payload.draft_id {
        if let Ok(draft) = crate::db::announcement_queries::get_announcement_draft_by_id(&state.db, draft_id).await {
            if let Some(path) = draft.image_local_path {
                if let Ok(dir) = state.app_handle.path().app_data_dir() {
                    let full_path = dir.join("images").join(&path);
                    if let Ok(bytes) = std::fs::read(&full_path) {
                        image_data = Some((bytes, path));
                    }
                }
            }
        }
    }

    if let Some((file_bytes, file_name)) = image_data {
        if file_bytes.len() > 2 * 1024 * 1024 {
            return Err(AppError::ValidationError("Gagal: Ukuran gambar melebihi 2MB.".to_string()));
        }

        let mime_type = if file_name.to_lowercase().ends_with(".png") {
            "image/png"
        } else {
            "image/jpeg"
        };

        let image_part = reqwest::multipart::Part::bytes(file_bytes)
            .file_name(file_name)
            .mime_str(mime_type)
            .map_err(|e| AppError::ValidationError(format!("Mime error: {}", e)))?;
            
        form = form.part("image", image_part);
    }

    let client = create_http_client();
    let url = format!("{}/announcements", API_BASE_URL);

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .multipart(form)
        .send()
        .await?;

    if res.status().is_success() || res.status() == 201 {
        // [ANC-API-01] Sukses + Hapus Draft
        if let Some(draft_id) = payload.draft_id {
            let _ = crate::db::announcement_queries::delete_announcement_draft(&state.db, &draft_id).await;
        }
        Ok("Pengumuman berhasil dipublikasikan.".to_string())
    } else {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        tracing::error!("Gagal membuat pengumuman: {} - {}", status, body);
        Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: None,
            message: format!("Gagal mempublikasikan pengumuman: {}", body),
        })
    }
}

pub async fn edit_announcement_service(
    state: &AppState,
    payload: crate::models::announcement_model::EditAnnouncementPayload,
) -> Result<String, AppError> {
    let token = crate::middlewares::role_guard::require_admin(state).await?;
    let client = create_http_client();
    let url = format!("{}/announcements/{}", API_BASE_URL, payload.id);

    let mut is_success = false;
    let mut err_status = 500;
    let mut err_body = String::new();

    if let (Some(file_bytes), Some(file_name)) = (payload.file_bytes, payload.file_name) {
        // Smart Chaining: Multipart form data if there's an image
        if file_bytes.len() > 2 * 1024 * 1024 {
            return Err(AppError::ValidationError("Gagal: Ukuran gambar melebihi 2MB.".to_string()));
        }

        let mime_type = if file_name.to_lowercase().ends_with(".png") {
            "image/png"
        } else {
            "image/jpeg"
        };

        let image_part = reqwest::multipart::Part::bytes(file_bytes)
            .file_name(file_name)
            .mime_str(mime_type)
            .map_err(|e| AppError::ValidationError(format!("Mime error: {}", e)))?;

        let mut form = reqwest::multipart::Form::new().part("image", image_part);
        
        if let Some(title) = payload.title {
            form = form.text("title", title);
        }
        if let Some(content) = payload.content {
            if serde_json::from_str::<serde_json::Value>(&content).is_err() {
                return Err(AppError::ValidationError("Format konten tidak valid.".to_string()));
            }
            form = form.text("content", content);
        }
        if let Some(category_id) = payload.category_id {
            form = form.text("category_id", category_id);
        }

        let res = client
            .patch(&url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await?;

        if res.status().is_success() {
            is_success = true;
        } else {
            err_status = res.status().as_u16();
            err_body = res.text().await.unwrap_or_default();
        }
    } else {
        // Smart Chaining: JSON payload if no image
        let mut json_payload = serde_json::Map::new();
        if let Some(title) = payload.title {
            json_payload.insert("title".to_string(), serde_json::Value::String(title));
        }
        if let Some(content) = payload.content {
            if serde_json::from_str::<serde_json::Value>(&content).is_err() {
                return Err(AppError::ValidationError("Format konten tidak valid.".to_string()));
            }
            json_payload.insert("content".to_string(), serde_json::Value::String(content));
        }
        if let Some(category_id) = payload.category_id {
            json_payload.insert("category_id".to_string(), serde_json::Value::String(category_id));
        }

        let res = client
            .patch(&url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .json(&json_payload)
            .send()
            .await?;

        if res.status().is_success() {
            is_success = true;
        } else {
            err_status = res.status().as_u16();
            err_body = res.text().await.unwrap_or_default();
        }
    }

    if is_success {
        Ok("Pengumuman berhasil diubah.".to_string())
    } else {
        Err(AppError::ApiError {
            http_status: err_status,
            status: "error".to_string(),
            code: None,
            message: format!("Gagal mengubah pengumuman: {}", err_body),
        })
    }
}

pub async fn delete_announcement_service(
    state: &AppState,
    id: String,
) -> Result<String, AppError> {
    let token = crate::middlewares::role_guard::require_admin(state).await?;
    let client = create_http_client();
    let url = format!("{}/announcements/{}", API_BASE_URL, id);

    let res = client
        .delete(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if res.status().is_success() {
        Ok("Pengumuman berhasil dihapus.".to_string())
    } else {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        if status.as_u16() == 404 {
            Err(AppError::ApiError {
                http_status: 404,
                status: "error".to_string(),
                code: None,
                message: "Pengumuman tidak ditemukan di server.".to_string(),
            })
        } else {
            Err(AppError::ApiError {
                http_status: status.as_u16(),
                status: "error".to_string(),
                code: None,
                message: format!("Gagal menghapus pengumuman: {}", body),
            })
        }
    }
}

pub async fn save_draft_announcement_service(
    state: &AppState,
    payload: crate::models::announcement_model::SaveAnnouncementDraftPayload,
) -> Result<String, AppError> {
    let mut image_local_path = None;

    if let (Some(bytes), Some(name)) = (payload.file_bytes, payload.file_name) {
        let filename = format!("{}_{}", payload.draft_id, name);
        crate::utils::file_utils::save_image_bytes(&state.app_handle, &bytes, &filename)?;
        image_local_path = Some(filename);
    } else if let Some(true) = payload.remove_image {
        image_local_path = None;
    } else {
        if let Ok(existing) = crate::db::announcement_queries::get_announcement_draft_by_id(&state.db, &payload.draft_id).await {
            image_local_path = existing.image_local_path;
        }
    }

    let draft = crate::models::announcement_model::AnnouncementDraft {
        draft_id: payload.draft_id,
        title: payload.title,
        content: payload.content,
        category_id: payload.category_id,
        image_local_path,
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    crate::db::announcement_queries::upsert_announcement_draft(&state.db, &draft).await?;
    Ok("Draft berhasil disimpan.".to_string())
}

pub async fn get_draft_announcements_service(
    state: &AppState,
) -> Result<Vec<crate::models::announcement_model::AnnouncementDraftResponse>, AppError> {
    let drafts = crate::db::announcement_queries::get_draft_announcements(&state.db).await?;
    let mut response = Vec::new();

    for d in drafts {
        let image_base64 = if let Some(ref path) = d.image_local_path {
            crate::utils::file_utils::read_image_as_base64(&state.app_handle, path).await
        } else {
            None
        };

        response.push(crate::models::announcement_model::AnnouncementDraftResponse {
            draft_id: d.draft_id,
            title: d.title,
            content: d.content,
            category_id: d.category_id,
            image_base64,
            updated_at: d.updated_at,
        });
    }

    Ok(response)
}

pub async fn delete_draft_announcement_service(
    state: &AppState,
    draft_id: String,
) -> Result<String, AppError> {
    crate::db::announcement_queries::delete_announcement_draft(&state.db, &draft_id).await?;
    Ok("Draft berhasil dihapus.".to_string())
}

pub async fn get_announcement_categories_service(
    state: &AppState,
) -> Result<Vec<crate::models::announcement_model::AnnouncementCategory>, AppError> {
    let token = crate::middlewares::role_guard::require_admin(state).await?;
    let client = create_http_client();
    let url = format!("{}/announcements/announcement-categories", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if res.status().is_success() {
        let api_response: crate::models::announcement_model::AnnouncementCategoryApiResponse = res.json().await?;
        Ok(api_response.data)
    } else {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: None,
            message: format!("Gagal mengambil daftar kategori: {}", body),
        })
    }
}

