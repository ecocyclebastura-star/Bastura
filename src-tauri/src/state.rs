use crate::error::AppError;
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;

// 1. Data Struktur Sesi Autentikasi di RAM
pub struct AuthState {
    pub access_token: Option<String>,
    pub expires_at: i64,
    pub is_refreshing: bool,
}

// 2. Pembungkus Global State untuk Tauri (`AppState`)
pub struct AppState {
    pub auth: Arc<Mutex<AuthState>>,
    pub db: SqlitePool,
}

impl AppState {
    // 3. Ubah fungsi new agar menerima parameter database
    pub fn new(db: SqlitePool) -> Self {
        Self {
            auth: Arc::new(Mutex::new(AuthState {
                access_token: None,
                expires_at: 0,
                is_refreshing: false,
            })),
            db,
        }
    }

    // 3. Fungsi "Satpam Pengatur Antrean Token"
    pub async fn get_valid_token(&self) -> Result<String, AppError> {
        // Ambil Mutex Lock (Request lain otomatis mengantre di baris ini jika sedang ada refresh)
        let mut auth = self.auth.lock().await;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // CEK HANGUS TOTAL: Jika sudah melewati batas 15 menit
        if auth.expires_at > 0 && now >= auth.expires_at {
            auth.access_token = None;
            auth.expires_at = 0;
            // Kembalikan error Unauthorized agar Rust/Vue tahu sesi sudah mati total
            return Err(AppError::Unauthorized);
        }

        // Jika token masih ada dan belum kedaluwarsa, langsung kembalikan
        if let Some(ref token) = auth.access_token {
            return Ok(token.clone());
        }

        // Jika tidak ada token sama sekali di RAM
        Err(AppError::MissingToken)
    }
}
