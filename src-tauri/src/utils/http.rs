use std::time::Duration;
use crate::utils::constants::REQUEST_TIMEOUT_SECS;

/// Membuat HTTP client dengan timeout terpusat.
/// Gunakan fungsi ini di semua service agar timeout konsisten di seluruh aplikasi.
pub fn create_http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .expect("Gagal membuat HTTP client")
}
