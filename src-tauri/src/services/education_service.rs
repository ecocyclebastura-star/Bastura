use crate::db::education_queries::{get_cached_education, upsert_education};
use crate::models::education_model::{EducationApiResponse, EducationClientResponse};
use crate::utils::constants::API_BASE_URL;
use crate::utils::http::create_http_client;
use crate::AppError;
use crate::AppState;
use reqwest::header::AUTHORIZATION;

pub async fn sync_education_from_server(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Menarik data edukasi dari server...");

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/education", API_BASE_URL);

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
                                            format!("{}/education/photo/{}", API_BASE_URL, filename)
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
                        tracing::error!("Gagal memparsing respon JSON edukasi: {}", e);
                        return Err(e.into());
                    }
                }
            } else {
                tracing::warn!(
                    "API edukasi merespons dengan status error: {}",
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
                "Gagal mengambil edukasi dari server (Mungkin offline): {}",
                e
            );
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
                                "{}/education/photo/{}",
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

pub async fn add_education_service(
    state: &AppState,
    payload: crate::models::education_model::AddEducationPayload,
) -> Result<String, AppError> {
    use tauri::Manager;
    let token = state.get_valid_token().await?;

    if payload.title.is_empty() || payload.title.len() > 200 {
        return Err(AppError::ValidationError("Judul maksimal 200 karakter dan wajib diisi.".to_string()));
    }

    if serde_json::from_str::<serde_json::Value>(&payload.content).is_err() {
        return Err(AppError::ValidationError("Format konten tidak valid.".to_string()));
    }

    let client = create_http_client();
    let url = format!("{}/education", API_BASE_URL);

    // Tahap 1: Create Education (JSON)
    let body = serde_json::json!({
        "title": payload.title,
        "content": payload.content,
    });

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&body)
        .send()
        .await?;

    if !res.status().is_success() && res.status() != 201 {
        let status = res.status();
        let body_text = res.text().await.unwrap_or_default();
        return Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: None,
            message: format!("Gagal mempublikasikan edukasi: {}", body_text),
        });
    }

    #[derive(serde::Deserialize)]
    struct CreateEduResponseData {
        id_content: Option<String>,
        id_education: Option<String>,
    }

    #[derive(serde::Deserialize)]
    struct CreateEduResponse {
        data: Option<CreateEduResponseData>,
        id_content: Option<String>,
        id_education: Option<String>,
    }

    let response_text = res.text().await.unwrap_or_default();
    let id_content = if let Ok(parsed) = serde_json::from_str::<CreateEduResponse>(&response_text) {
        if let Some(data) = parsed.data {
            data.id_content.or(data.id_education).unwrap_or_default()
        } else if let Some(id) = parsed.id_content.or(parsed.id_education) {
            id
        } else {
            return Err(AppError::ValidationError(format!("Gagal mendapatkan id_content dari server: {}", response_text)));
        }
    } else {
        return Err(AppError::ValidationError(format!("Gagal parsing response id_content: {}", response_text)));
    };
    
    if id_content.is_empty() {
        return Err(AppError::ValidationError(format!("Gagal mendapatkan id dari server: {}", response_text)));
    }

    // Draft will be deleted at the end

    // Tahap 2: Upload Photo (Optional)
    let mut image_data = None;

    if let (Some(bytes), Some(name)) = (payload.file_bytes, payload.file_name) {
        image_data = Some((bytes, name));
    } else if let Some(draft_id) = &payload.draft_id {
        if let Ok(draft) = crate::db::education_queries::get_education_draft_by_id(&state.db, draft_id).await {
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
            return Ok("Edukasi berhasil dibuat, tetapi gagal mengunggah foto: Ukuran file melebihi batas.".to_string());
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

        let form = reqwest::multipart::Form::new().part("image", image_part);
        let photo_url = format!("{}/education/photo/{}", API_BASE_URL, id_content);
        
        let photo_res = client
            .post(&photo_url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await?;

        if !photo_res.status().is_success() {
            return Ok("Edukasi berhasil dibuat, tetapi gagal mengunggah foto.".to_string());
        }
    }

    // Auto cleanup draft if present
    if let Some(draft_id) = &payload.draft_id {
        let _ = crate::db::education_queries::delete_education_draft(&state.db, draft_id).await;
    }

    Ok("Edukasi berhasil dipublikasikan.".to_string())
}

pub async fn edit_education_service(
    state: &AppState,
    payload: crate::models::education_model::EditEducationPayload,
) -> Result<String, AppError> {
    let token = state.get_valid_token().await?;
    let client = create_http_client();
    
    let mut is_success = false;

    // Tahap 1: PATCH JSON
    if payload.title.is_some() || payload.content.is_some() {
        let url = format!("{}/education/{}", API_BASE_URL, payload.id);
        let mut body_map = serde_json::Map::new();
        
        if let Some(title) = payload.title {
            if title.len() > 200 {
                return Err(AppError::ValidationError("Judul maksimal 200 karakter.".to_string()));
            }
            body_map.insert("title".to_string(), serde_json::Value::String(title));
        }
        
        if let Some(content) = payload.content {
            if serde_json::from_str::<serde_json::Value>(&content).is_err() {
                return Err(AppError::ValidationError("Format konten tidak valid.".to_string()));
            }
            body_map.insert("content".to_string(), serde_json::Value::String(content));
        }
        
        let res = client
            .patch(&url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .json(&body_map)
            .send()
            .await?;

        if res.status().is_success() {
            is_success = true;
        } else {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(AppError::ApiError {
                http_status: status.as_u16(),
                status: "error".to_string(),
                code: None,
                message: format!("Gagal mengedit edukasi: {}", body),
            });
        }
    }

    // Tahap 2: POST Multipart (Photo)
    if let (Some(file_bytes), Some(file_name)) = (payload.file_bytes, payload.file_name) {
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

        let form = reqwest::multipart::Form::new().part("image", image_part);
        let photo_url = format!("{}/education/photo/{}", API_BASE_URL, payload.id);
        
        let photo_res = client
            .post(&photo_url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await?;

        if photo_res.status().is_success() {
            is_success = true;
        } else {
            let status = photo_res.status();
            let body = photo_res.text().await.unwrap_or_default();
            return Err(AppError::ApiError {
                http_status: status.as_u16(),
                status: "error".to_string(),
                code: None,
                message: format!("Gagal mengunggah foto edukasi: {}", body),
            });
        }
    }

    if is_success {
        Ok("Edukasi berhasil diubah.".to_string())
    } else {
        Err(AppError::ValidationError("Tidak ada perubahan yang dikirim.".to_string()))
    }
}

pub async fn delete_education_service(state: &AppState, id: &str) -> Result<String, AppError> {
    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/education/{}", API_BASE_URL, id);

    let res = client
        .delete(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if res.status().is_success() {
        Ok("Edukasi berhasil dihapus.".to_string())
    } else {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: None,
            message: format!("Gagal menghapus edukasi: {}", body),
        })
    }
}

pub async fn save_draft_education_service(
    state: &AppState,
    payload: crate::models::education_model::SaveEducationDraftPayload,
) -> Result<String, AppError> {
    let mut image_local_path = None;

    if let (Some(bytes), Some(name)) = (payload.file_bytes, payload.file_name) {
        let filename = format!("{}_{}", payload.draft_id, name);
        crate::utils::file_utils::save_image_bytes(&state.app_handle, &bytes, &filename)?;
        image_local_path = Some(filename);
    } else if let Some(true) = payload.remove_image {
        image_local_path = None;
    } else {
        if let Ok(existing) = crate::db::education_queries::get_education_draft_by_id(&state.db, &payload.draft_id).await {
            image_local_path = existing.image_local_path;
        }
    }

    let draft = crate::models::education_model::EducationDraft {
        draft_id: payload.draft_id,
        title: payload.title,
        content: payload.content,
        image_local_path,
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    crate::db::education_queries::upsert_education_draft(&state.db, &draft).await?;
    Ok("Draft berhasil disimpan.".to_string())
}

pub async fn get_draft_educations_service(
    state: &AppState,
) -> Result<Vec<crate::models::education_model::EducationDraftResponse>, AppError> {
    let drafts = crate::db::education_queries::get_draft_educations(&state.db).await?;
    let mut response = Vec::new();

    for d in drafts {
        let image_base64 = if let Some(ref path) = d.image_local_path {
            crate::utils::file_utils::read_image_as_base64(&state.app_handle, path).await
        } else {
            None
        };

        response.push(crate::models::education_model::EducationDraftResponse {
            draft_id: d.draft_id,
            title: d.title,
            content: d.content,
            image_base64,
            updated_at: d.updated_at,
        });
    }

    Ok(response)
}

pub async fn delete_draft_education_service(
    state: &AppState,
    draft_id: &str,
) -> Result<String, AppError> {
    if let Ok(draft) = crate::db::education_queries::get_education_draft_by_id(&state.db, draft_id).await {
        if let Some(path) = draft.image_local_path {
            use tauri::Manager;
            if let Ok(dir) = state.app_handle.path().app_data_dir() {
                let full_path = dir.join("images").join(path);
                let _ = std::fs::remove_file(full_path);
            }
        }
    }
    crate::db::education_queries::delete_education_draft(&state.db, draft_id).await?;
    Ok("Draft berhasil dihapus.".to_string())
}
