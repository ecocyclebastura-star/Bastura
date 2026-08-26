use crate::AppError;
use keyring::Entry;
use std::fs;
use std::path::PathBuf;

const SERVICE_NAME: &str = "bastura_app";
const REFRESH_TOKEN_KEY: &str = "refresh_token";

fn fallback_path() -> PathBuf {
    std::env::temp_dir().join(".bastura_rt")
}

// Simpan Refresh Token (Mencoba Keyring dulu, jika OS tidak punya Keyring store fallback ke file privat aplikasi)
pub fn save_refresh_token(token: &str) -> Result<(), AppError> {
    tracing::info!("Memulai proses penyimpanan refresh token...");
    if let Ok(entry) = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY) {
        if entry.set_password(token).is_ok() {
            tracing::info!("Refresh token berhasil disimpan di OS Keyring.");
            return Ok(());
        }
    }

    // Fallback jika Keyring OS tidak didukung (seperti Android Emulator tanpa DBus)
    tracing::warn!("Gagal menyimpan di OS Keyring, beralih ke metode fallback (file).");
    fs::write(fallback_path(), token).map_err(|e| {
        tracing::error!("Gagal menyimpan fallback token: {}", e);
        AppError::Unknown(format!("Gagal simpan fallback token: {}", e))
    })?;

    tracing::info!("Refresh token berhasil disimpan menggunakan fallback (file).");
    Ok(())
}

// Ambil Refresh Token dari OS Keyring / Fallback
pub fn get_refresh_token() -> Result<String, AppError> {
    tracing::debug!("Memulai proses pengambilan refresh token...");
    if let Ok(entry) = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY) {
        if let Ok(token) = entry.get_password() {
            tracing::debug!("Refresh token berhasil diambil dari OS Keyring.");
            return Ok(token);
        }
    }

    // Fallback baca dari file privat aplikasi
    tracing::debug!("Refresh token tidak ditemukan di OS Keyring, mencoba fallback (file).");
    let path = fallback_path();
    if path.exists() {
        let token = fs::read_to_string(path).map_err(|e| {
            tracing::error!("Gagal membaca fallback token dari file: {}", e);
            AppError::Unknown(format!("Gagal baca fallback token: {}", e))
        })?;
        let trimmed = token.trim().to_string();
        if !trimmed.is_empty() {
            tracing::debug!("Refresh token berhasil diambil dari fallback (file).");
            return Ok(trimmed);
        }
    }

    tracing::warn!("Refresh token tidak ditemukan di OS Keyring maupun file fallback.");
    Err(AppError::MissingToken)
}

// Hapus Refresh Token dari OS Keyring / Fallback (Saat Logout / Expired)
pub fn delete_refresh_token() -> Result<(), AppError> {
    tracing::info!("Memulai proses penghapusan refresh token...");
    if let Ok(entry) = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY) {
        if entry.delete_credential().is_ok() {
            tracing::info!("Refresh token berhasil dihapus dari OS Keyring.");
        } else {
            tracing::debug!("Penghapusan token dari OS Keyring diabaikan (mungkin tidak ada).");
        }
    }

    let path = fallback_path();
    if path.exists() {
        if fs::remove_file(path).is_ok() {
            tracing::info!("Refresh token fallback (file) berhasil dihapus.");
        } else {
            tracing::warn!("Gagal menghapus file fallback refresh token.");
        }
    }

    tracing::info!("Proses penghapusan refresh token selesai.");
    Ok(())
}
