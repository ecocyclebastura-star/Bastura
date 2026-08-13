pub mod controllers;
pub mod db;
pub mod middlewares;
pub mod models;
pub mod services;

pub mod utils;

pub use utils::{AppError, AppState};
use tauri::{Manager, Emitter}; // 2. Import Manager agar bisa menyuntikkan AppState

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    
    tauri::Builder::default()
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
            let db_url = format!("sqlite:{}", db_path.to_str().expect("Path invalid UTF-8"));

            // Blok async untuk menunggu database selesai disiapkan
            tauri::async_runtime::block_on(async move {
                let db_pool = db::init_db(&db_url)
                    .await
                    .expect("Gagal menginisialisasi SQLite");

                let app_state = AppState::new(db_pool);
                
                // Spawn Session Watcher
                let watcher_state = app_state.clone();
                let watcher_handle = handle.clone();
                
                tauri::async_runtime::spawn(async move {
                    tracing::info!("Session Watcher dimulai...");
                    loop {
                        tokio::time::sleep(tokio::time::Duration::from_secs(240)).await;
                        
                        tracing::info!("Session Watcher: Memeriksa sesi...");
                        
                        // 1. Cek token menggunakan logika terpusat di state.rs
                        let force_cleanup = match watcher_state.get_valid_token().await {
                            Err(crate::AppError::Unauthorized) => {
                                tracing::warn!("Session Watcher: Token RAM sudah kedaluwarsa. Melewati API call.");
                                true
                            }
                            _ => false,
                        };
                        
                        if force_cleanup {
                            crate::services::auth_service::cleanup_session_service(&watcher_state).await;
                            let _ = watcher_handle.emit("on_session_expired", ());
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
                handle.manage(app_state);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            crate::controllers::auth_controller::login_command,
            crate::controllers::auth_controller::logout_command,
            crate::controllers::auth_controller::signup_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
