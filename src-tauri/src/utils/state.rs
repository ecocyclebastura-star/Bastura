use super::error::AppError;
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter};

// 1. Data Struktur Sesi Autentikasi di RAM
pub struct AuthState {
    pub access_token: Option<String>,
    pub expires_at: i64,
    pub is_refreshing: bool,
}

// 2. Pembungkus Global State untuk Tauri (`AppState`)
#[derive(Clone)]
pub struct AppState {
    pub auth: Arc<Mutex<AuthState>>,
    pub db: SqlitePool,
    pub otp_cache: Arc<std::sync::Mutex<std::collections::HashMap<String, (String, i64)>>>,
    pub app_handle: AppHandle,
}

impl AppState {
    // 3. Ubah fungsi new agar menerima parameter database dan app_handle
    pub fn new(db: SqlitePool, app_handle: AppHandle) -> Self {
        Self {
            auth: Arc::new(Mutex::new(AuthState {
                access_token: None,
                expires_at: 0,
                is_refreshing: false,
            })),
            db,
            otp_cache: Arc::new(std::sync::Mutex::new(std::collections::HashMap::new())),
            app_handle,
        }
    }

    // 3. Fungsi "Satpam Pengatur Antrean Token"
    pub async fn get_valid_token(&self) -> Result<String, AppError> {
        let mut is_expired = false;
        
        {
            // Ambil Mutex Lock (Request lain otomatis mengantre di baris ini jika sedang ada refresh)
            let mut auth = self.auth.lock().await;

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            // CEK HANGUS TOTAL: Jika sudah melewati batas 15 menit
            if auth.expires_at > 0 && now >= auth.expires_at {
                auth.access_token = None;
                auth.expires_at = 0; // Set ke 0 agar pemanggil konkuren tidak memicu emit lagi
                is_expired = true;
            } else if let Some(ref token) = auth.access_token {
                // Jika token masih ada dan belum kedaluwarsa, langsung kembalikan
                return Ok(token.clone());
            }
        } // Lock auth dilepas di sini agar tidak terjadi deadlock saat cleanup

        if is_expired {
            tracing::warn!("Token kedaluwarsa terdeteksi di get_valid_token. Memicu cleanup & emit on_session_expired");
            crate::services::auth_service::cleanup_session_service(self).await;
            let _ = self.app_handle.emit("on_session_expired", ());
            
            // Kembalikan error Unauthorized agar Rust/Vue tahu sesi sudah mati total
            return Err(AppError::Unauthorized);
        }

        // Jika tidak ada token sama sekali di RAM
        Err(AppError::MissingToken)
    }
}
