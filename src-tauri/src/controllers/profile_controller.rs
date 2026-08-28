use crate::db::profile_queries::get_cached_profile;
use crate::models::profile_model::ProfileClientResponse;
use crate::utils::file_utils::read_image_as_base64;
use crate::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_profile_command(
    state: State<'_, AppState>,
) -> Result<Option<ProfileClientResponse>, AppError> {
    tracing::info!("Menjalankan command: get_profile_command (Offline-First)");

    // Jalankan Smart Sync Service agar profil langsung ter-update di background
    if let Err(e) = crate::services::sync_service::run_smart_sync_service(&state).await {
        tracing::warn!("Smart Sync gagal: {}. Melanjutkan dengan data cache...", e);
    }

    let cached_profile = match get_cached_profile(&state.db).await? {
        Some(profile) => Some(profile),
        None => {
            tracing::info!(
                "Data profil tidak ditemukan di cache lokal. Mencoba sinkronisasi paksa..."
            );
            if let Err(e) = crate::services::profile_service::sync_profile_from_server(&state).await
            {
                tracing::error!("Sinkronisasi paksa profil gagal: {}", e);
            }
            // Coba ambil lagi setelah sync
            get_cached_profile(&state.db).await?
        }
    };

    let profile = match cached_profile {
        Some(p) => p,
        None => {
            tracing::warn!("Profil tetap tidak ditemukan meskipun sudah mencoba sinkronisasi.");
            return Ok(None);
        }
    };

    let mut avatar_base64 = None;
    if let Some(avatar_url) = &profile.avatar_url {
        let filename = avatar_url.split('/').last().unwrap_or("avatar.jpg");
        if let Some(b64) = read_image_as_base64(&state.app_handle, filename).await {
            avatar_base64 = Some(b64);
        }
    }

    // Jika gambar lokal tidak ada atau pengunduhan gagal, gunakan gambar dummy dari backend
    if avatar_base64.is_none() {
        let dummy_bytes = include_bytes!("../../assets/dummy_avatar.png");
        use base64::{engine::general_purpose, Engine as _};
        let encoded = general_purpose::STANDARD.encode(dummy_bytes);
        avatar_base64 = Some(format!("data:image/png;base64,{}", encoded));
    }

    let response = ProfileClientResponse {
        id: profile.id_users,
        name: profile.name.unwrap_or_default(),
        email: profile.email,
        phone: profile.phone.unwrap_or_default(),
        avatar_base64,
    };

    Ok(Some(response))
}

#[tauri::command]
pub async fn update_full_profile_command(
    state: State<'_, AppState>,
    name: Option<String>,
    phone: Option<String>,
    avatar_name: Option<String>,
    avatar_bytes: Option<Vec<u8>>,
) -> Result<ProfileClientResponse, AppError> {
    tracing::info!("Menjalankan command: update_full_profile_command");

    let mut latest_profile = None;

    // 1. Update Bio jika ada input
    if name.is_some() || phone.is_some() {
        let profile =
            crate::services::profile_service::update_bio_service(&state, name, phone).await?;
        latest_profile = Some(profile);
    }

    // 2. Upload Avatar jika ada input
    if let (Some(f_name), Some(f_bytes)) = (avatar_name, avatar_bytes) {
        let upload_result = crate::services::profile_service::upload_avatar_service(
            &state,
            f_name.clone(),
            f_bytes.clone(),
        )
        .await;

        match upload_result {
            Ok(profile) => {
                latest_profile = Some(profile);

                // Optimasi: Simpan langsung avatar bytes ke lokal (hindari HTTP GET)
                use tauri::Manager;
                if let Ok(app_dir) = state.app_handle.path().app_data_dir() {
                    let image_dir = app_dir.join("images");
                    let _ = std::fs::create_dir_all(&image_dir);
                    
                    // Gunakan nama file resmi dari API agar cocok dengan database SQLite
                    let api_filename = latest_profile.as_ref().unwrap().avatar_url.as_deref()
                        .and_then(|url| url.split('/').last())
                        .unwrap_or(&f_name);

                    let filepath = image_dir.join(api_filename);

                    if let Ok(mut file) = std::fs::File::create(&filepath) {
                        use std::io::Write;
                        let _ = file.write_all(&f_bytes);
                    }
                }
            }
            Err(e) => {
                // Partial Success: Jika avatar gagal tapi bio sukses, simpan bio ke SQLite dulu!
                if let Some(ref bio_profile) = latest_profile {
                    if let Ok(token) = state.get_valid_token().await {
                        let user_id = crate::services::profile_service::decode_jwt_id(&token);
                        let avatar_filename: Option<&str> = bio_profile
                            .avatar_url
                            .as_deref()
                            .and_then(|url: &str| url.split('/').last());
                        let _ = crate::db::profile_queries::upsert_profile(
                            &state.db,
                            &user_id,
                            &bio_profile.name,
                            &bio_profile.email,
                            &bio_profile.phone,
                            avatar_filename,
                        )
                        .await;
                    }
                }
                return Err(e);
            }
        }
    }

    // 3. Jika ada perubahan sukses (bio atau avatar), simpan ke SQLite
    if let Some(profile) = latest_profile {
        if let Ok(token) = state.get_valid_token().await {
            let user_id = crate::services::profile_service::decode_jwt_id(&token);
            let avatar_filename: Option<&str> = profile
                .avatar_url
                .as_deref()
                .and_then(|url: &str| url.split('/').last());

            let _ = crate::db::profile_queries::upsert_profile(
                &state.db,
                &user_id,
                &profile.name,
                &profile.email,
                &profile.phone,
                avatar_filename,
            )
            .await;

            // Konversi ke Response
            let mut avatar_base64 = None;
            if let Some(filename) = avatar_filename {
                if let Some(b64) = read_image_as_base64(&state.app_handle, filename).await {
                    avatar_base64 = Some(b64);
                }
            }

            return Ok(ProfileClientResponse {
                id: user_id,
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                avatar_base64,
            });
        }
    }

    // Jika tidak ada input (semua None), baca saja dari cache
    match get_profile_command(state).await? {
        Some(p) => Ok(p),
        None => Err(AppError::Unknown(
            "Tidak ada profil untuk diperbarui dan cache kosong".to_string(),
        )),
    }
}

#[tauri::command]
pub async fn deactivate_account_command(
    state: State<'_, AppState>,
) -> Result<bool, AppError> {
    tracing::info!("Menjalankan command: deactivate_account_command");

    // 1. Tembak API Deaktivasi
    crate::services::profile_service::deactivate_account_service(&state).await?;

    // 2. Bumi-hanguskan sesi lokal (DB & Token) jika API merespons OK
    crate::services::auth_service::cleanup_session_service(&state).await;

    Ok(true)
}
