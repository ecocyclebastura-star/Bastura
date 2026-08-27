use crate::db::profile_queries::upsert_profile;
use crate::models::profile_model::{ProfileApiResponse, ProfileItem};
use crate::utils::constants::API_BASE_URL;
use crate::utils::file_utils::download_and_save_image;
use crate::utils::http::create_http_client;
use crate::utils::logger::log_network_error;
use crate::AppError;
use crate::AppState;
use reqwest::header::AUTHORIZATION;

pub async fn sync_profile_from_server(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Memulai sinkronisasi profil pengguna...");

    let token = state.get_valid_token().await?;
    let client = create_http_client();

    let url = format!("{}/users/account/profile", API_BASE_URL);
    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Sync Profile (kirim request)", &e);
            return Err(e.into());
        }
    };

    if !response.status().is_success() {
        tracing::warn!(
            "Gagal mengambil profil dari server. HTTP Status: {}",
            response.status()
        );
        return Err(AppError::ApiError {
            http_status: response.status().as_u16(),
            status: "error".to_string(),
            code: None,
            message: format!("HTTP Status: {}", response.status()),
        });
    }

    let api_response = match response.json::<ProfileApiResponse>().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing JSON /users/account/profile: {}", e);
            return Err(e.into());
        }
    };

    if api_response.data.data.is_empty() {
        tracing::warn!("Data profil kosong dari server.");
        return Ok(()); // Tidak ada yang disinkronisasi
    }

    let profile_item = &api_response.data.data[0];
    let user_id = decode_jwt_id(&token);

    // Download avatar if available
    let mut local_avatar_filename = None;
    if let Some(avatar_url) = &profile_item.avatar_url {
        let filename = avatar_url
            .split('/')
            .last()
            .unwrap_or("avatar.jpg")
            .to_string();

        tracing::info!("Mencoba mengunduh avatar profil: {}", filename);
        if let Err(e) =
            download_and_save_image(&state.app_handle, avatar_url, &token, &filename).await
        {
            tracing::error!("Gagal mengunduh avatar profil: {}", e);
            // Tetap lanjut meskipun gagal download avatar
        } else {
            local_avatar_filename = Some(filename);
        }
    }

    // Upsert ke database
    upsert_profile(
        &state.db,
        &user_id,
        &profile_item.name,
        &profile_item.email,
        &profile_item.phone,
        local_avatar_filename.as_deref(),
    )
    .await?;

    tracing::info!("Sinkronisasi profil pengguna selesai.");
    Ok(())
}

pub fn decode_jwt_id(token: &str) -> String {
    use base64::Engine as _;
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() == 3 {
        let payload = parts[1];
        let decoded_opt = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(payload)
            .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(payload));

        if let Ok(decoded) = decoded_opt {
            if let Ok(json_str) = String::from_utf8(decoded) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(id) = val.get("id").or_else(|| val.get("sub")) {
                        if let Some(s) = id.as_str() {
                            return s.to_string();
                        }
                    }
                }
            }
        }
    }
    "local_user".to_string() // fallback
}

pub async fn update_bio_service(
    state: &AppState,
    name: Option<String>,
    phone: Option<String>,
) -> Result<ProfileItem, AppError> {
    use crate::models::profile_model::UpdateBioRequest;

    tracing::info!("Memulai proses update bio...");
    let token = state.get_valid_token().await?;
    let client = create_http_client();

    let url = format!("{}/users/account/profile", API_BASE_URL);
    let payload = UpdateBioRequest { name, phone };

    let res = client
        .patch(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Update Bio (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = response.status().as_u16();

    if !response.status().is_success() {
        let (error_msg, error_code) = if let Ok(json) = response.json::<serde_json::Value>().await {
            let msg = json
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal memperbarui bio")
                .to_string();
            let code = json
                .get("code")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (msg, code)
        } else {
            (
                "Terjadi kesalahan pada server saat update bio".to_string(),
                None,
            )
        };

        tracing::error!("Gagal update bio (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: error_code,
            message: error_msg,
        });
    }

    let api_response = match response.json::<ProfileApiResponse>().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing JSON update bio: {}", e);
            return Err(e.into());
        }
    };

    let profile_item =
        api_response.data.data.into_iter().next().ok_or_else(|| {
            AppError::Unknown("Data profil tidak ditemukan di respons".to_string())
        })?;

    Ok(profile_item)
}

pub async fn upload_avatar_service(
    state: &AppState,
    file_name: String,
    file_bytes: Vec<u8>,
) -> Result<ProfileItem, AppError> {
    tracing::info!("Memulai proses upload avatar...");
    
    // Pengecekan ukuran file (maksimal 500KB)
    if file_bytes.len() > 500 * 1024 {
        tracing::warn!("Upload dibatalkan di backend Rust: Ukuran file melebihi 500KB");
        return Err(AppError::ValidationError(
            "Ukuran foto maksimal adalah 500KB.".to_string(),
        ));
    }

    let token = state.get_valid_token().await?;
    let client = create_http_client();

    let url = format!("{}/users/account/profile/avatar", API_BASE_URL);

    let part = reqwest::multipart::Part::bytes(file_bytes).file_name(file_name.clone());

    let form = reqwest::multipart::Form::new().part("avatar", part);

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .multipart(form)
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Upload Avatar (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = response.status().as_u16();

    if !response.status().is_success() {
        let (error_msg, error_code) = if let Ok(json) = response.json::<serde_json::Value>().await {
            let msg = json
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal mengunggah avatar")
                .to_string();
            let code = json
                .get("code")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (msg, code)
        } else {
            (
                "Terjadi kesalahan pada server saat unggah avatar".to_string(),
                None,
            )
        };

        tracing::error!("Gagal unggah avatar (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: error_code,
            message: error_msg,
        });
    }

    let api_response = match response.json::<ProfileApiResponse>().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing JSON upload avatar: {}", e);
            return Err(e.into());
        }
    };

    let profile_item = api_response.data.data.into_iter().next().ok_or_else(|| {
        AppError::Unknown("Data profil tidak ditemukan di respons avatar".to_string())
    })?;

    Ok(profile_item)
}

pub async fn deactivate_account_service(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Memulai proses deaktivasi akun (soft delete)...");
    let token = state.get_valid_token().await?;
    let client = create_http_client();
    
    let url = format!("{}/users/account/profile/deactive", API_BASE_URL);
    
    // HTTP PATCH dengan body JSON kosong
    let res = client
        .patch(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&serde_json::json!({}))
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Deaktivasi Akun (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = response.status().as_u16();

    if !response.status().is_success() {
        let (error_msg, error_code) = if let Ok(json) = response.json::<serde_json::Value>().await {
            let msg = json
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal menonaktifkan akun")
                .to_string();
            let code = json
                .get("code")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (msg, code)
        } else {
            ("Terjadi kesalahan pada server saat menonaktifkan akun".to_string(), None)
        };

        tracing::error!("Gagal deaktivasi akun (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: error_code,
            message: error_msg,
        });
    }

    tracing::info!("Deaktivasi akun berhasil di sisi server.");
    Ok(())
}
