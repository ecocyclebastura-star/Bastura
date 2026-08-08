pub mod controllers;
pub mod middlewares;
pub mod models;
pub mod services;

mod db;
mod error;
mod state; // 1. Daftarkan modul db

pub use error::AppError;
pub use state::AppState;
use tauri::Manager; // 2. Import Manager agar bisa menyuntikkan AppState

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

            let db_path = app_dir.join("bastura.db");

            // Blok async untuk menunggu database selesai disiapkan
            tauri::async_runtime::block_on(async move {
                let db_pool = db::init_db(&db_path)
                    .await
                    .expect("Gagal menginisialisasi SQLite");

                // Masukkan db_pool ke dalam AppState, lalu daftarkan ke sistem Tauri
                handle.manage(AppState::new(db_pool));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
