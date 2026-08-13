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
    if let Ok(entry) = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY) {
        if entry.set_password(token).is_ok() {
            return Ok(());
        }
    }
    
    // Fallback jika Keyring OS tidak didukung (seperti Android Emulator tanpa DBus)
    fs::write(fallback_path(), token).map_err(|e| AppError::Unknown(format!("Gagal simpan fallback token: {}", e)))?;
    Ok(())
}

// Ambil Refresh Token dari OS Keyring / Fallback
pub fn get_refresh_token() -> Result<String, AppError> {
    if let Ok(entry) = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY) {
        if let Ok(token) = entry.get_password() {
            return Ok(token);
        }
    }

    // Fallback baca dari file privat aplikasi
    let path = fallback_path();
    if path.exists() {
        let token = fs::read_to_string(path).map_err(|e| AppError::Unknown(format!("Gagal baca fallback token: {}", e)))?;
        let trimmed = token.trim().to_string();
        if !trimmed.is_empty() {
            return Ok(trimmed);
        }
    }

    Err(AppError::MissingToken)
}

// Hapus Refresh Token dari OS Keyring / Fallback (Saat Logout / Expired)
pub fn delete_refresh_token() -> Result<(), AppError> {
    if let Ok(entry) = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY) {
        let _ = entry.delete_credential();
    }
    
    let path = fallback_path();
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    
    Ok(())
}
