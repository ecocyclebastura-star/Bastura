pub mod controllers;
pub mod db;
pub mod middlewares;
pub mod models;
pub mod services;

pub mod utils;

use tauri::{Emitter, Manager};
pub use utils::{AppError, AppState}; // 2. Import Manager agar bisa menyuntikkan AppState

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // 3. Gunakan hook 'setup' untuk menjalankan fungsi async saat aplikasi dibuka
        .setup(|app| {
            let handle = app.handle().clone();

            // Dapatkan direktori data khusus aplikasi yang aman & writable untuk Android/Desktop
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Gagal mendapatkan app_data_dir");

            // Pastikan folder direktori sudah dibuat
            if let Err(e) = std::fs::create_dir_all(&app_dir) {
                eprintln!("Gagal membuat direktori app_data: {}", e);
            }

            // Inisialisasi logger di sini agar tersimpan di direktori yang tepat
            crate::utils::setup_logger(&app_dir);
            let db_path = app_dir.join("bastura.db");

            // Blok async untuk menunggu database selesai disiapkan
            tauri::async_runtime::block_on(async move {
                let db_pool = db::init_db(&db_path)
                    .await
                    .expect("Gagal menginisialisasi SQLite");

                let app_state = AppState::new(db_pool, handle.clone());
                
                // Spawn Session Watcher
                let watcher_state = app_state.clone();
                let watcher_handle = handle.clone();
                
                tauri::async_runtime::spawn(async move {
                    tracing::info!("Session Watcher dimulai...");
                    loop {
                        tokio::time::sleep(tokio::time::Duration::from_secs(840)).await;
                        
                        tracing::info!("Session Watcher: Memeriksa sesi...");
                        
                        // 1. Cek token menggunakan logika terpusat di state.rs
                        let is_expired = match watcher_state.get_valid_token().await {
                            Err(crate::AppError::Unauthorized) => {
                                tracing::warn!("Session Watcher: Token RAM sudah kedaluwarsa. Melewati API call.");
                                true
                            }
                            _ => false,
                        };
                        
                        if is_expired {
                            // get_valid_token sudah otomatis melakukan cleanup dan emit
                            continue;
                        }
                        
                        // 2. Coba hit API refresh
                        match crate::services::auth_service::refresh_session_service(&watcher_state).await {
                            Ok(_) => {
                                tracing::info!("Session Watcher: Sesi berhasil diperbarui.");
                            }
                            Err(AppError::Network(_)) => {
                                // Gagal karena masalah jaringan / offline, abaikan
                                tracing::warn!("Session Watcher: Gagal terhubung ke server. Mengabaikan...");
                            }
                            Err(AppError::MissingToken) => {
                                // Belum login, abaikan
                            }
                            Err(e) => {
                                // Gagal karena token ditolak (4xx) atau format salah
                                tracing::error!("Session Watcher: Token ditolak atau rusak ({}). Melakukan cleanup.", e);
                                crate::services::auth_service::cleanup_session_service(&watcher_state).await;
                                let _ = watcher_handle.emit("on_session_expired", ());
                            }
                        }
                    }
                });

                // Masukkan db_pool ke dalam AppState, lalu daftarkan ke sistem Tauri
                let worker_state = app_state.clone();
                let worker_handle = handle.clone();
                handle.manage(app_state);

                // Jalankan Balance Worker di background (hanya emit jika user sudah login)
                // Pool tidak lagi dilewatkan secara terpisah — sudah ada di dalam AppState (worker_state.db)
                crate::services::balance_worker::start_balance_worker(
                    worker_handle,
                    worker_state,
                );
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            crate::controllers::auth_controller::login_command,
            crate::controllers::auth_controller::logout_command,
            crate::controllers::auth_controller::signup_command,
            crate::controllers::auth_controller::forgot_password_command,
            crate::controllers::auth_controller::reset_password_command,
            crate::controllers::announcement_controller::get_announcements_command,
            crate::controllers::education_controller::get_education_command,
            crate::controllers::profile_controller::get_profile_command,
            crate::controllers::profile_controller::update_full_profile_command,
            crate::controllers::profile_controller::deactivate_account_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
