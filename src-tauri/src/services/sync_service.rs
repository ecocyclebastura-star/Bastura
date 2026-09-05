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
                let status = response.status();
                let body_text = response.text().await.unwrap_or_default();
                tracing::warn!(
                    "API /updates merespons dengan status error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
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

    // 6. Sync Transaction History
    if let Some(server_transaction_up) = &server_data.transaction_up {
        let local_transaction_up = get_last_sync(&state.db, "transaction").await?;

        let needs_sync = match local_transaction_up {
            Some(local_ts) => server_transaction_up > &local_ts,
            None => true,
        };

        if needs_sync {
            tracing::info!("Terdapat pembaruan Riwayat Transaksi. Mulai sinkronisasi...");
            if let Err(e) =
                crate::services::transaction_service::sync_transaction_log_from_server(state).await
            {
                tracing::error!("Sinkronisasi riwayat transaksi gagal: {}", e);
            } else {
                update_last_sync(&state.db, "transaction", server_transaction_up).await?;
                tracing::info!("Sinkronisasi Riwayat Transaksi selesai.");
            }
        } else {
            tracing::debug!("Riwayat Transaksi sudah up-to-date.");
        }
    }

    // Cleanup unused images after sync finishes
    crate::utils::file_utils::cleanup_unused_images(&state.app_handle, &state.db).await;

    Ok(true)
}
