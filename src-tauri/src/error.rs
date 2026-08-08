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

    #[error("Sesi telah habis (Unauthorized / 401)")]
    Unauthorized,

    #[error("Token akses tidak ditemukan, silakan login kembali")]
    MissingToken,

    #[error("Error tidak terduga: {0}")]
    Unknown(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Kirimkan pesan error aslinya sebagai string ke Vue
        serializer.serialize_str(self.to_string().as_ref())
    }
}
