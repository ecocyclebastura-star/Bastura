use crate::db::sync_queries::{get_last_sync, update_last_sync};
use crate::models::sync_model::SyncApiResponse;
use crate::utils::constants::API_BASE_URL;
use crate::utils::http::create_http_client;
use crate::AppError;
use crate::AppState;
use reqwest::header::AUTHORIZATION;

pub async fn run_smart_sync_service(state: &AppState) -> Result<bool, AppError> {
    tracing::info!("Menjalankan Smart Sync Service...");

    // 1. Ambil token
    let token = state.get_valid_token().await?;

    // 2. Fetch API Updates
    let client = create_http_client();
    let url = format!("{}/updates", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let api_response = match res {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<SyncApiResponse>().await {
                    Ok(data) => data,
                    Err(e) => {
                        tracing::error!("Gagal memparsing respon JSON /updates: {}", e);
                        return Err(e.into());
                    }
                }
            } else {
                tracing::warn!(
                    "API /updates merespons dengan status error: {}",
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
                "Gagal mengambil data /updates dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let server_data = api_response.data;

    // 3. Sync Announcements
    if let Some(server_announcements_up) = &server_data.announcements_up {
        let local_announcements_up = get_last_sync(&state.db, "announcements").await?;

        let needs_sync = match local_announcements_up {
            Some(local_ts) => server_announcements_up > &local_ts,
            None => true,
        };

        if needs_sync {
            tracing::info!("Terdapat pembaruan Pengumuman. Mulai sinkronisasi...");
            if let Err(e) =
                crate::services::announcement_service::sync_announcements_from_server(state).await
            {
                tracing::error!("Sinkronisasi pengumuman gagal: {}", e);
            } else {
                update_last_sync(&state.db, "announcements", server_announcements_up).await?;
                tracing::info!("Sinkronisasi Pengumuman selesai.");
            }
        } else {
            tracing::debug!("Pengumuman sudah up-to-date.");
        }
    }

    // 4. Sync Education
    if let Some(server_education_up) = &server_data.education_up {
        let local_education_up = get_last_sync(&state.db, "education").await?;

        let needs_sync = match local_education_up {
            Some(local_ts) => server_education_up > &local_ts,
            None => true,
        };

        if needs_sync {
            tracing::info!("Terdapat pembaruan Edukasi. Mulai sinkronisasi...");
            if let Err(e) =
                crate::services::education_service::sync_education_from_server(state).await
            {
                tracing::error!("Sinkronisasi edukasi gagal: {}", e);
            } else {
                update_last_sync(&state.db, "education", server_education_up).await?;
                tracing::info!("Sinkronisasi Edukasi selesai.");
            }
        } else {
            tracing::debug!("Edukasi sudah up-to-date.");
        }
    }

    // 5. Sync Profile
    if let Some(server_profile_up) = &server_data.profile_up {
        let local_profile_up = get_last_sync(&state.db, "profile").await?;

        let needs_sync = match local_profile_up {
            Some(local_ts) => server_profile_up > &local_ts,
            None => true,
        };

        if needs_sync {
            tracing::info!("Terdapat pembaruan Profil Pengguna. Mulai sinkronisasi...");
            if let Err(e) = crate::services::profile_service::sync_profile_from_server(state).await
            {
                tracing::error!("Sinkronisasi profil gagal: {}", e);
            } else {
                update_last_sync(&state.db, "profile", server_profile_up).await?;
                tracing::info!("Sinkronisasi Profil selesai.");
            }
        } else {
            tracing::debug!("Profil sudah up-to-date.");
        }
    }

    // TODO: Sync kategori lain (transaction, dll) dengan cara yang sama.

    // Cleanup unused images after sync finishes
    crate::utils::file_utils::cleanup_unused_images(&state.app_handle, &state.db).await;

    Ok(true)
}
