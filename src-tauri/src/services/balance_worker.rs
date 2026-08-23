use crate::models::profile_model::BalanceUpdatePayload;
use crate::services::transaction_service;
use crate::AppState;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;

/// Jalankan background worker yang secara periodik mengambil saldo terkini
/// dari server dan mengirimkan hasilnya ke frontend via event Tauri.
///
/// Worker hanya aktif ketika user sudah login (access_token tersedia di RAM).
/// Jika belum login atau sedang offline, siklus dilewati tanpa error.
pub fn start_balance_worker(app: tauri::AppHandle, state: AppState) {
    tokio::spawn(async move {
        tracing::info!("Balance Worker dimulai...");

        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;

            // --- Cek sesi: lewati siklus jika user belum login ---
            let has_token = {
                let auth = state.auth.lock().await;
                auth.access_token.is_some()
            };

            if !has_token {
                tracing::debug!("Balance Worker: Tidak ada sesi aktif, melewati siklus ini...");
                continue;
            }

            // --- Ambil saldo dari API asli ---
            let balance = match transaction_service::fetch_real_balance(&state).await {
                Ok(val) => val,
                Err(crate::AppError::Network(_)) => {
                    // Offline / server tidak dapat dijangkau — bukan error kritis
                    tracing::warn!("Balance Worker: Gagal terhubung ke server. Siklus dilewati.");
                    continue;
                }
                Err(crate::AppError::MissingToken) | Err(crate::AppError::Unauthorized) => {
                    // Sesi sudah tidak valid — lewati, biarkan Session Watcher yang menangani
                    tracing::debug!(
                        "Balance Worker: Token tidak valid atau sudah expired. Siklus dilewati."
                    );
                    continue;
                }
                Err(e) => {
                    tracing::error!("Balance Worker: Gagal mengambil saldo: {}", e);
                    continue;
                }
            };

            // --- Buat timestamp ISO 8601 UTC ---
            let last_updated = build_iso_timestamp();

            // --- Emit ke frontend Vue ---
            if let Err(e) = app.emit(
                "on_balance_update",
                BalanceUpdatePayload {
                    saldo: balance,
                    last_updated,
                },
            ) {
                tracing::error!("Balance Worker: Gagal emit event ke frontend: {}", e);
            } else {
                tracing::info!(
                    "Balance Worker: Saldo berhasil dikirim ke frontend: {} IDR",
                    balance
                );
            }
        }
    });
}

/// Buat string timestamp ISO 8601 UTC dari waktu sistem saat ini.
///
/// Menggunakan kalkulasi langsung dari UNIX epoch untuk menghindari
/// ketergantungan pada crate `chrono`. Akurat untuk representasi UTC.
fn build_iso_timestamp() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    // Dekomposisi waktu dari UNIX epoch
    let s = (secs % 60) as u32;
    let m = ((secs / 60) % 60) as u32;
    let h = ((secs / 3600) % 24) as u32;

    // Kalkulasi tanggal dari jumlah hari sejak epoch
    let mut days = secs / 86400;

    // Iterasi tahun dari 1970 untuk menangani tahun kabisat dengan benar
    let mut year = 1970u32;
    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }

    // Iterasi bulan dalam tahun yang sudah ditemukan
    let leap = is_leap_year(year);
    let month_days: [u64; 12] = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut month = 1u32;
    for &md in &month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }
    let day = (days + 1) as u32;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, h, m, s
    )
}

/// Periksa apakah suatu tahun adalah tahun kabisat.
fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}
