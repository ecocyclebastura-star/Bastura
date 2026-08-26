use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Koneksi jaringan gagal atau server tidak merespons: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Gagal membaca atau memproses data JSON: {0}")]
    JsonParse(#[from] serde_json::Error),

    #[error("Terjadi kesalahan pada database lokal (SQLite): {0}")]
    Database(#[from] sqlx::Error),

    #[error("Gagal mengakses penyimpanan kunci aman (Keyring): {0}")]
    Keyring(#[from] keyring::Error),

    /// Menampung error dari server (bisa membawa kode spesifik atau cuma pesan teks biasa)
    #[error("{message}")]
    ApiError {
        http_status: u16,
        status: String,
        code: Option<String>,
        message: String,
    },

    #[error("Sesi telah kedaluwarsa")]
    Unauthorized,

    #[error("Token tidak ditemukan")]
    MissingToken,

    #[error("Validasi gagal: {0}")]
    ValidationError(String),

    #[error("Error tidak terduga: {0}")]
    Unknown(String),
}

#[derive(Serialize)]
pub struct AppErrorResponse {
    pub code: String,
    pub message: String,
    pub http_status: u16,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let (code, message, http_status) = match self {
            AppError::Network(_) => (
                "NETWORK_OFFLINE".to_string(),
                "Gagal terhubung ke server".to_string(),
                0,
            ),
            AppError::JsonParse(e) => ("JSON_PARSE_ERROR".to_string(), e.to_string(), 500),
            AppError::Database(e) => ("DATABASE_ERROR".to_string(), e.to_string(), 500),
            AppError::Keyring(e) => ("KEYRING_ERROR".to_string(), e.to_string(), 500),
            AppError::ApiError {
                http_status,
                code,
                message,
                ..
            } => {
                let code_str = code.clone().unwrap_or_else(|| {
                    if *http_status == 401 {
                        "UNAUTHORIZED".to_string()
                    } else if *http_status == 429 {
                        "RATE_LIMIT_EXCEEDED".to_string()
                    } else {
                        "API_ERROR".to_string()
                    }
                });
                (code_str, message.clone(), *http_status)
            }
            AppError::Unauthorized => (
                "UNAUTHORIZED".to_string(),
                "Sesi telah kedaluwarsa".to_string(),
                401,
            ),
            AppError::MissingToken => (
                "UNAUTHORIZED".to_string(),
                "Token tidak ditemukan".to_string(),
                401,
            ),
            AppError::ValidationError(msg) => ("VALIDATION_ERROR".to_string(), msg.clone(), 400),
            AppError::Unknown(msg) => ("UNKNOWN_ERROR".to_string(), msg.clone(), 500),
        };

        let response = AppErrorResponse {
            code,
            message,
            http_status,
        };

        response.serialize(serializer)
    }
}
