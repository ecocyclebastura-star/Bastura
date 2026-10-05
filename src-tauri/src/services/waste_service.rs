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
                            // Handle Soft Delete
                            if server_item.deleted_at.is_some() {
                                if let Err(e) = crate::db::waste_queries::delete_catalog_item(&state.db, &server_item.id_waste).await {
                                    tracing::error!("Gagal menghapus katalog dari SQLite: {}", e);
                                }
                                continue;
                            }

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
    let mut items = get_cached_catalog(&state.db, search_query, category_id).await?;

    // --- Workaround Interceptor ---
    // Menyembunyikan jejak tag [UNIT:PC] dari frontend dan mengubah unit kembali menjadi "pc"
    for item in items.iter_mut() {
        if let Some(desc) = &item.description {
            if desc.contains("[UNIT:PC]") {
                let clean_desc = desc.replace("[UNIT:PC]", "").trim().to_string();
                if clean_desc.is_empty() {
                    item.description = None;
                } else {
                    item.description = Some(clean_desc);
                }
                item.unit = Some("pc".to_string());
            }
        }
    }

    Ok(items)
}

pub async fn add_catalog_with_photo_service(
    state: &AppState,
    token: &str,
    payload: crate::models::waste_model::AddCatalogRequest,
) -> Result<String, AppError> {
    // A. Validasi Lokal (Zero-Trust)
    if payload.price < 0.0 {
        return Err(AppError::ValidationError("Harga tidak boleh negatif".to_string()));
    }

    if let Some(ref bytes) = payload.file_bytes {
        if bytes.len() > 500 * 1024 {
            tracing::warn!("Upload katalog dibatalkan: Ukuran file melebihi 500KB");
            return Err(AppError::ValidationError("Ukuran foto maksimal adalah 500KB.".to_string()));
        }
    }

    // B. Tahap 1: Eksekusi API Create Catalog
    let client = create_http_client();
    let url = format!("{}/waste/catalog", API_BASE_URL);

    // --- Workaround untuk Unit "pc" ---
    let mut final_unit = payload.unit.clone();
    let mut final_desc = payload.description.clone().unwrap_or_default();

    if final_unit.to_lowercase() == "pc" || final_unit.to_lowercase() == "pcs" {
        final_unit = "kg".to_string();
        if final_desc.is_empty() {
            final_desc = "[UNIT:PC]".to_string();
        } else {
            final_desc = format!("{} [UNIT:PC]", final_desc);
        }
    }

    // Bikin JSON payload untuk Tahap 1 tanpa file_path
    let json_payload = serde_json::json!({
        "name": payload.name,
        "category_id": payload.category_id,
        "unit": final_unit,
        "price": payload.price,
        "description": final_desc,
    });

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&json_payload)
        .send()
        .await?;

    let status = res.status();
    if !status.is_success() {
        let http_status = status.as_u16();
        let body_text = res.text().await.unwrap_or_default();
        tracing::warn!("API Create Catalog Error ({}): {}", http_status, body_text);

        let body_json: Option<serde_json::Value> = serde_json::from_str(&body_text).ok();
        let code = body_json.as_ref().and_then(|v| v.get("code")).and_then(|c| c.as_str());
        let message = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or(&format!("Gagal membuat katalog sampah (HTTP {}): {}", http_status, body_text))
            .to_string();

        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: code.map(|s| s.to_string()),
            message,
        });
    }

    let api_response: crate::models::waste_model::AddCatalogApiResponse = res.json().await?;
    let id_waste = api_response.data.id_waste;

    // C. Tahap 2: Eksekusi API Upload Photo (Jika ada file)
    if let (Some(f_name), Some(f_bytes)) = (payload.file_name, payload.file_bytes) {
        let part = reqwest::multipart::Part::bytes(f_bytes).file_name(f_name);
        let form = reqwest::multipart::Form::new().part("image", part);

        let upload_url = format!("{}/waste/catalog/photo/{}", API_BASE_URL, id_waste);
        let upload_res = client
            .post(&upload_url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await;

        match upload_res {
            Ok(r) if r.status().is_success() => {
                return Ok("Katalog beserta foto berhasil ditambahkan.".to_string());
            }
            Ok(r) => {
                tracing::warn!("Upload gagal (HTTP {}). Response: {:?}", r.status(), r.text().await.ok());
                return Ok("Katalog berhasil dibuat, namun gagal mengunggah gambar. Silakan edit manual.".to_string());
            }
            Err(e) => {
                tracing::warn!("Upload gagal (Jaringan): {}", e);
                return Ok("Katalog berhasil dibuat, namun gagal mengunggah gambar. Silakan edit manual.".to_string());
            }
        }
    }

    // Paksa sinkronisasi lokal agar data langsung up-to-date
    let _ = crate::services::sync_service::run_smart_sync_service(state).await;

    Ok("Katalog berhasil ditambahkan.".to_string())
}

pub async fn edit_catalog_service(
    state: &AppState,
    token: &str,
    payload: crate::models::waste_model::EditCatalogRequest,
) -> Result<String, AppError> {
    // 1. Validasi Lokal
    if let Some(price) = payload.price {
        if price < 0.0 {
            return Err(AppError::ValidationError("Harga tidak boleh negatif".to_string()));
        }
    }

    let mut photo_bytes = payload.file_bytes;
    let mut photo_filename = payload.file_name;
    
    if let Some(ref bytes) = photo_bytes {
        if bytes.len() > 500 * 1024 {
            tracing::warn!("Upload katalog dibatalkan: Ukuran file melebihi 500KB");
            return Err(AppError::ValidationError("Ukuran foto maksimal adalah 500KB.".to_string()));
        }
    }

    let client = create_http_client();
    let mut tahap1_success = false;
    let mut tahap1_msg = "Data tidak berubah.".to_string();

    // 2. Tahap 1: PATCH Teks (jika ada properti teks yang diubah)
    if payload.name.is_some() || payload.category_id.is_some() || payload.unit.is_some() || payload.price.is_some() || payload.description.is_some() {
        let mut final_unit = payload.unit.clone();
        let mut final_desc = payload.description.clone();

        // Workaround untuk Unit "pc"
        if let Some(ref unit) = final_unit {
            if unit.to_lowercase() == "pc" || unit.to_lowercase() == "pcs" {
                final_unit = Some("kg".to_string());
                let mut desc = final_desc.unwrap_or_default();
                if !desc.contains("[UNIT:PC]") {
                    if desc.is_empty() {
                        desc = "[UNIT:PC]".to_string();
                    } else {
                        desc = format!("{} [UNIT:PC]", desc);
                    }
                }
                final_desc = Some(desc);
            }
        } else if final_desc.is_some() {
            // Jika unit tidak diubah (None), tapi deskripsi diubah, periksa apakah sebelumnya dia adalah "pc"
            let current_items = crate::db::waste_queries::get_cached_catalog(&state.db, None, None).await.unwrap_or_default();
            if let Some(cached) = current_items.iter().find(|i| i.id_waste == payload.id) {
                // Di dalam SQLite mentah, description belum di-intercept (masih mengandung [UNIT:PC])
                // get_cached_catalog mengembalikan raw data (tag belum dihapus, tag dihapus hanya di fetch_catalog_service)
                if let Some(ref current_desc) = cached.description {
                    if current_desc.contains("[UNIT:PC]") {
                        let mut desc = final_desc.unwrap_or_default();
                        if !desc.contains("[UNIT:PC]") {
                            if desc.is_empty() {
                                desc = "[UNIT:PC]".to_string();
                            } else {
                                desc = format!("{} [UNIT:PC]", desc);
                            }
                        }
                        final_desc = Some(desc);
                    }
                }
            }
        }

        let mut map = serde_json::Map::new();
        if let Some(v) = payload.name { map.insert("name".to_string(), serde_json::json!(v)); }
        if let Some(v) = payload.category_id { map.insert("category_id".to_string(), serde_json::json!(v)); }
        if let Some(v) = final_unit { map.insert("unit".to_string(), serde_json::json!(v)); }
        if let Some(v) = payload.price { map.insert("price".to_string(), serde_json::json!(v)); }
        if let Some(v) = final_desc { map.insert("description".to_string(), serde_json::json!(v)); }

        let json_payload = serde_json::Value::Object(map);
        let url = format!("{}/waste/catalog/{}", API_BASE_URL, payload.id);

        let res = client.patch(&url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .json(&json_payload)
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let body_text = res.text().await.unwrap_or_default();
            let body_json: Option<serde_json::Value> = serde_json::from_str(&body_text).ok();
            let message = body_json.as_ref().and_then(|v| v.get("message")).and_then(|m| m.as_str())
                .unwrap_or(&format!("Gagal update katalog (HTTP {}): {}", status.as_u16(), body_text)).to_string();
            
            return Err(AppError::ApiError {
                http_status: status.as_u16(),
                status: "error".to_string(),
                code: body_json.as_ref().and_then(|v| v.get("code")).and_then(|c| c.as_str()).map(|s| s.to_string()),
                message,
            });
        }
        tahap1_success = true;
        tahap1_msg = "Katalog sampah berhasil diperbarui.".to_string();
    }

    // 3. Tahap 2: POST Photo
    let has_photo = photo_bytes.is_some();
    if let (Some(f_bytes), Some(f_name)) = (photo_bytes, photo_filename) {
        let part = reqwest::multipart::Part::bytes(f_bytes).file_name(f_name);
        let form = reqwest::multipart::Form::new().part("image", part);

        let upload_url = format!("{}/waste/catalog/photo/{}", API_BASE_URL, payload.id);
        let upload_res = client.post(&upload_url)
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await;

        match upload_res {
            Ok(r) if r.status().is_success() => {
                if tahap1_success {
                    return Ok("Katalog dan foto berhasil diperbarui.".to_string());
                } else {
                    return Ok("Foto katalog berhasil diperbarui.".to_string());
                }
            }
            Ok(r) => {
                if r.status().as_u16() == 413 {
                    return Ok(format!("{} Namun gagal memperbarui foto: Ukuran melebihi 5MB.", if tahap1_success { "Data berhasil diubah," } else { "" }));
                }
                return Ok(format!("{} Namun gagal memperbarui foto (HTTP {}).", if tahap1_success { "Data berhasil diubah," } else { "" }, r.status().as_u16()));
            }
            Err(_) => {
                return Ok(format!("{} Namun gagal memperbarui foto (Jaringan).", if tahap1_success { "Data berhasil diubah," } else { "" }));
            }
        }
    }

    // Hapus cache image_base64 di SQLite agar sync_catalog_from_server memaksa unduh ulang foto terbaru
    if has_photo {
        let _ = sqlx::query("UPDATE waste_catalog SET image_base64 = NULL WHERE id_waste = $1")
            .bind(&payload.id)
            .execute(&state.db)
            .await;
    }

    // Paksa sinkronisasi lokal agar data langsung up-to-date
    let _ = crate::services::sync_service::run_smart_sync_service(state).await;

    Ok(tahap1_msg)
}

pub async fn delete_catalog_service(
    state: &AppState,
    token: &str,
    id: String,
) -> Result<(), AppError> {
    let client = create_http_client();
    let url = format!("{}/waste/catalog/{}", API_BASE_URL, id);

    let res = client.delete(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    let status = res.status();
    if !status.is_success() {
        let body_text = res.text().await.unwrap_or_default();
        let body_json: Option<serde_json::Value> = serde_json::from_str(&body_text).ok();
        let code = body_json.as_ref().and_then(|v| v.get("code")).and_then(|c| c.as_str());
        
        if status.as_u16() == 404 || code == Some("CATALOG_NOT_FOUND") {
            return Err(AppError::ApiError {
                http_status: 404,
                status: "error".to_string(),
                code: Some("CATALOG_NOT_FOUND".to_string()),
                message: "Gagal: ID sampah tidak ditemukan atau sudah dihapus.".to_string(),
            });
        }
        
        let message = body_json.as_ref().and_then(|v| v.get("message")).and_then(|m| m.as_str())
            .unwrap_or(&format!("Gagal hapus katalog (HTTP {}): {}", status.as_u16(), body_text)).to_string();
        
        return Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: code.map(|s| s.to_string()),
            message,
        });
    }

    // Paksa sinkronisasi lokal agar data langsung terhapus di cache
    let _ = crate::services::sync_service::run_smart_sync_service(state).await;

    Ok(())
}

pub async fn get_waste_categories_service(
    _state: &AppState,
    token: &str,
) -> Result<Vec<crate::models::waste_model::WasteCategory>, AppError> {
    let client = create_http_client();
    let url = format!("{}/waste/catalog-categories", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    let status = res.status();
    if status.is_success() {
        let api_response: crate::models::waste_model::GetCategoriesApiResponse = res.json().await.map_err(|e| {
            tracing::error!("Gagal memparsing JSON API Kategori: {}", e);
            AppError::ApiError {
                http_status: 500,
                status: "error".to_string(),
                code: None,
                message: "Format response server tidak sesuai.".to_string(),
            }
        })?;
        Ok(api_response.data.data)
    } else {
        let error_text = res.text().await.unwrap_or_default();
        tracing::error!("API Kategori Sampah error: HTTP {} - {}", status, error_text);
        Err(AppError::ApiError {
            http_status: status.as_u16(),
            status: "error".to_string(),
            code: None,
            message: "Gagal mengambil daftar kategori sampah.".to_string(),
        })
    }
}

pub async fn scan_waste_ai_service(
    state: &AppState,
    payload: crate::models::waste_model::ScanWasteAiRequest,
) -> Result<crate::models::waste_model::ScanWasteAiResponse, AppError> {
    let token = state.get_valid_token().await?;

    // 1. Validasi Ukuran File (Maksimal 5MB)
    let max_size = 5 * 1024 * 1024; // 5 MB
    if payload.file_bytes.len() > max_size {
        return Err(AppError::ValidationError(
            "Gagal: Ukuran gambar melebihi batas maksimal 5MB.".to_string(),
        ));
    }

    // 2. Validasi Ekstensi File
    let ext = payload
        .file_name
        .split('.')
        .last()
        .unwrap_or("")
        .to_lowercase();
    let mime_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        _ => {
            return Err(AppError::ValidationError(
                "Gagal: Format gambar harus JPG, PNG, atau WEBP.".to_string(),
            ))
        }
    };

    let client = create_http_client();
    let url = format!("{}/waste/catalog/scan-ai", API_BASE_URL);

    // 3. Bangun Multipart Form
    let image_part = reqwest::multipart::Part::bytes(payload.file_bytes)
        .file_name(payload.file_name)
        .mime_str(mime_type)
        .map_err(|e| AppError::ValidationError(format!("Mime error: {}", e)))?;

    let form = reqwest::multipart::Form::new().part("image", image_part);

    // 4. Lakukan HTTP Request
    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .multipart(form)
        .send()
        .await?;

    let status = res.status();

    if status.is_success() {
        let ai_response = res
            .json::<crate::models::waste_model::ScanWasteAiResponse>()
            .await
            .map_err(|e| {
                tracing::error!("Gagal parsing response AI: {}", e);
                AppError::ApiError {
                    http_status: 500,
                    status: "error".to_string(),
                    code: None,
                    message: "Gagal memproses balasan dari AI.".to_string(),
                }
            })?;
        Ok(ai_response)
    } else {
        let error_body = res.text().await.unwrap_or_default();
        tracing::error!("API Scan AI error: HTTP {} - {}", status, error_body);

        if status.as_u16() == 400 {
            // Bisa berupa IMAGE_REQUIRED, INVALID_FILE_TYPE, dll.
            Err(AppError::ValidationError(
                "Gagal: Format gambar tidak disetujui server atau gambar kosong.".to_string(),
            ))
        } else if status.as_u16() >= 500 {
            Err(AppError::ApiError {
                http_status: status.as_u16(),
                status: "error".to_string(),
                code: None,
                message: "Sistem AI sedang bermasalah, silakan coba beberapa saat lagi."
                    .to_string(),
            })
        } else {
            Err(AppError::ApiError {
                http_status: status.as_u16(),
                status: "error".to_string(),
                code: None,
                message: format!("Gagal memproses gambar (HTTP {}).", status),
            })
        }
    }
}
