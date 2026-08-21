use crate::db::profile_queries;
use crate::models::profile_model::BalanceUpdatePayload;
use crate::AppState;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;

pub fn start_balance_worker(app: tauri::AppHandle, pool: sqlx::SqlitePool, state: AppState) {
    tokio::spawn(async move {
        tracing::info!("Balance Worker dimulai...");

        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;

            // Cek apakah ada sesi aktif (user sudah login)
            let has_token = {
                let auth = state.auth.lock().await;
                auth.access_token.is_some()
            };

            if !has_token {
                tracing::debug!("Balance Worker: Tidak ada sesi aktif, melewati siklus ini...");
                continue;
            }

            // Simulasi penambahan saldo
            if let Err(e) = profile_queries::simulate_add_balance(&pool).await {
                tracing::error!("Balance Worker: Gagal menambah saldo simulasi: {}", e);
                continue;
            }

            // Ambil saldo terbaru
            let saldo = match profile_queries::get_current_balance(&pool, "user-local-123").await {
                Ok(val) => val,
                Err(e) => {
                    tracing::error!("Balance Worker: Gagal mengambil saldo: {}", e);
                    continue;
                }
            };

            // Buat timestamp ISO 8601 sederhana dari UNIX time
            let last_updated = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| {
                    let secs = d.as_secs();
                    // Format: YYYY-MM-DDTHH:MM:SSZ (UTC)
                    let s = secs % 60;
                    let m = (secs / 60) % 60;
                    let h = (secs / 3600) % 24;
                    let total_days = secs / 86400;
                    // Estimasi sederhana dari total hari sejak epoch
                    let year = 1970 + total_days / 365;
                    let day_of_year = total_days % 365;
                    let month = day_of_year / 30 + 1;
                    let day = day_of_year % 30 + 1;
                    format!(
                        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
                        year, month, day, h, m, s
                    )
                })
                .unwrap_or_else(|_| "unknown".to_string());

            // Emit ke frontend Vue
            if let Err(e) = app.emit(
                "on_balance_update",
                BalanceUpdatePayload { saldo, last_updated },
            ) {
                tracing::error!("Balance Worker: Gagal emit event ke frontend: {}", e);
            } else {
                tracing::info!("Balance Worker: Saldo berhasil dikirim ke frontend: {} IDR", saldo);
            }
        }
    });
}
