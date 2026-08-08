use crate::error::AppError;
use keyring::Entry;

const SERVICE_NAME: &str = "bastura_app";
const REFRESH_TOKEN_KEY: &str = "refresh_token";

// Simpan Refresh Token ke OS Keyring
pub fn save_refresh_token(token: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY)?;
    entry.set_password(token)?;
    Ok(())
}

// Ambil Refresh Token dari OS Keyring
pub fn get_refresh_token() -> Result<String, AppError> {
    let entry = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY)?;
    let token = entry.get_password()?;
    Ok(token)
}

// Hapus Refresh Token dari OS Keyring (Saat Logout / Expired)
pub fn delete_refresh_token() -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, REFRESH_TOKEN_KEY)?;
    let _ = entry.delete_credential();
    Ok(())
}
