use crate::middlewares::auth_store::save_refresh_token;
use crate::models::auth_model::{
    ApiData, ForgotPasswordApiResponse, ForgotPasswordRequest, LoginApiResponse, LoginRequest,
    LoginRequestPayload, LoginSuccessResponse, RefreshApiResponse, RefreshRequest,
    ResetPasswordRequest, SignupRequest, SignupRequestPayload,
};
use crate::utils::{create_http_client, log_network_error, API_BASE_URL};
use crate::AppError;
use crate::AppState;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn login_service(
    state: &AppState,
    payload: LoginRequestPayload,
) -> Result<LoginSuccessResponse, AppError> {
    tracing::info!("Memulai proses login...");
    let client = create_http_client();
    let api_req = LoginRequest {
        email: payload.email.clone(),
        password: payload.password,
    };

    let res = match client
        .post(&format!("{}/auth/login", API_BASE_URL))
        .json(&api_req)
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            log_network_error("Login (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = res.status().as_u16();

    // Jika response bukan success (bukan 2xx)
    if !res.status().is_success() {
        // Coba baca pesan error dari JSON
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Terjadi kesalahan pada server")
                .to_string()
        } else {
            "Terjadi kesalahan pada server".to_string()
        };

        tracing::error!("Gagal login (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: None, // Akan diurus di Serialize `error.rs`
            message: error_msg,
        });
    }

    // Jika success 200, baca sebagai text dulu agar bisa dilacak kalau ada error format
    let text_res = res.text().await?;
    let api_res: LoginApiResponse = match serde_json::from_str(&text_res) {
        Ok(data) => data,
        Err(e) => {
            return Err(AppError::Unknown(format!(
                "Format JSON tidak sesuai dengan struct: {}. Raw JSON: {}",
                e, text_res
            )));
        }
    };

    let data = api_res
        .data
        .ok_or_else(|| AppError::Unknown("Data user tidak ditemukan dari respons".to_string()))?;

    Ok(establish_session(state, data).await)
}

/// Simpan token hasil login/signup, lalu susun data user buat frontend.
///
/// Dipakai bareng `login_service` dan `signup_service` supaya keduanya tidak
/// pernah beda perlakuan soal penyimpanan token.
async fn establish_session(state: &AppState, data: ApiData) -> LoginSuccessResponse {
    // 0. Cek apakah pengguna yang login sama dengan pengguna di cache lokal
    let cached_user_id = crate::db::profile_queries::get_cached_user_id(&state.db)
        .await
        .unwrap_or(None);

    let is_same_user = match cached_user_id {
        Some(id) => id == data.user.id,
        None => false,
    };

    if !is_same_user {
        tracing::info!("Pengguna berbeda terdeteksi (atau cache kosong). Membersihkan data lokal lama...");
        crate::services::auth_service::cleanup_session_service(state).await;
    } else {
        tracing::info!("Pengguna yang sama login kembali. Mengamankan cache data lokal.");
        // Tetap bersihkan status RAM sebelum mengisi ulang
        let mut auth = state.auth.lock().await;
        auth.access_token = None;
        auth.expires_at = 0;
    }

    // 1. Simpan Refresh Token menggunakan auth_store (middleware)
    if let Err(e) = save_refresh_token(&data.tokens.refresh_token) {
        tracing::warn!("Gagal menyimpan refresh_token: {}", e);
    }

    // 2. Simpan Access Token ke RAM (AppState)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let expires_at = now + data.tokens.expires_in;

    // 3. Role diambil dari klaim JWT, bukan dari body respons
    let role_str = decode_jwt_role(&data.tokens.access_token);

    {
        let mut auth = state.auth.lock().await;
        auth.access_token = Some(data.tokens.access_token);
        auth.expires_at = expires_at;
    }

    tracing::info!("Sesi berhasil dibuat.");

    LoginSuccessResponse {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: role_str,
    }
}

pub async fn signup_service(
    state: &AppState,
    payload: SignupRequestPayload,
) -> Result<LoginSuccessResponse, AppError> {
    tracing::info!("Memulai proses pendaftaran pengguna baru...");
    // Validasi lokal: pastikan password dan confirm_password cocok
    if payload.password != payload.confirm_password {
        return Err(AppError::ValidationError(
            "kata sandi tidak cocok dengan field konfirmasi kata sandi.".to_string(),
        ));
    }

    // Disalin dulu sebelum `payload` pindah ke `api_req`: dipakai buat login
    // otomatis kalau respons signup ternyata tidak membawa token.
    let email = payload.email.clone();
    let password = payload.password.clone();

    let client = create_http_client();
    let api_req = SignupRequest {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        confirm_password: payload.confirm_password,
    };

    let res = match client
        .post(&format!("{}/auth/signup", API_BASE_URL))
        .json(&api_req)
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            log_network_error("Sign Up (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = res.status().as_u16();

    // Jika response bukan success (bukan 2xx)
    if !res.status().is_success() {
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Terjadi kesalahan saat registrasi")
                .to_string()
        } else {
            "Terjadi kesalahan pada server saat registrasi".to_string()
        };

        tracing::error!("Gagal Sign Up (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: None,
            message: error_msg,
        });
    }

    // Sampai sini akunnya sudah jadi di server (HTTP-nya 2xx). Yang belum
    // pasti cuma satu: apakah respons signup ikut membawa token atau tidak.
    // Endpoint signup tidak dijamin mengembalikan sesi seperti endpoint
    // login, jadi parsingnya diperlakukan sebagai "kalau ada, syukur".
    let text_res = res.text().await?;

    match serde_json::from_str::<LoginApiResponse>(&text_res) {
        Ok(api_res) => match api_res.data {
            Some(data) => {
                tracing::info!("Sign Up berhasil dan responsnya langsung membawa token.");
                return Ok(establish_session(state, data).await);
            }
            None => tracing::info!("Sign Up berhasil, tapi field 'data' kosong."),
        },
        Err(e) => {
            // Isi respons sengaja tidak di-log mentah-mentah: kalau ternyata
            // ada token di dalamnya, tokennya ikut mendarat di file log.
            // Nama field-nya saja sudah cukup buat menelusuri bentuk respons.
            let fields = serde_json::from_str::<serde_json::Value>(&text_res)
                .ok()
                .and_then(|v| {
                    v.as_object()
                        .map(|o| o.keys().cloned().collect::<Vec<_>>().join(", "))
                })
                .unwrap_or_else(|| "tidak terbaca".to_string());

            tracing::info!(
                "Respons Sign Up tidak berbentuk respons login ({}). Field teratas: [{}]",
                e,
                fields
            );
        }
    }

    // Akun sudah terbuat tapi sesinya belum ada. Login otomatis pakai
    // kredensial yang barusan diisi, supaya user tidak dilempar ke halaman
    // login cuma buat mengetik ulang data yang sama.
    tracing::info!("Membuat sesi lewat login otomatis setelah signup.");

    login_service(state, LoginRequestPayload { email, password })
        .await
        .map_err(|e| {
            tracing::error!("Login otomatis setelah signup gagal: {}", e);
            AppError::ApiError {
                http_status: 200,
                status: "error".to_string(),
                // Ditangkap khusus di frontend: akunnya jadi, sesinya saja
                // yang gagal, jadi user cukup diarahkan ke halaman login.
                code: Some("SIGNUP_LOGIN_REQUIRED".to_string()),
                message: "Akun berhasil dibuat, tapi sesi otomatis gagal dibuat. Silakan masuk lewat halaman login.".to_string(),
            }
        })
}

pub async fn cleanup_session_service(state: &AppState) {
    tracing::info!("Memulai proses pembersihan sesi (cleanup)...");
    // 1. Hapus dari Keyring
    let _ = crate::middlewares::auth_store::delete_refresh_token();

    // 2. Hapus dari RAM
    {
        let mut auth = state.auth.lock().await;
        auth.access_token = None;
        auth.expires_at = 0;
    }

    // 3. Hapus data cache di SQLite
    let tables_to_clear = [
        "profile_cache",
        "transaction_history_cache",
        "daftar_warga_cache",
        "transaksi_global_cache",
    ];

    let _ = crate::db::sync_queries::clear_user_cache_and_sync_logs(&state.db, &tables_to_clear).await;
    tracing::info!("Proses pembersihan sesi selesai.");
}

pub async fn refresh_session_service(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Memulai proses penyegaran sesi (refresh token)...");
    // 1. Ambil refresh token dari keyring
    let refresh_token = match crate::middlewares::auth_store::get_refresh_token() {
        Ok(t) => t,
        Err(_) => return Err(AppError::MissingToken),
    };

    // 2. Ambil access token dari RAM state jika ada
    let access_token_opt = {
        let auth = state.auth.lock().await;
        auth.access_token.clone()
    };

    let client = create_http_client();
    let api_req = RefreshRequest { refresh_token };

    let mut req_builder = client
        .post(&format!("{}/auth/refresh", API_BASE_URL))
        .json(&api_req);

    if let Some(access_token) = access_token_opt {
        if !access_token.is_empty() {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", access_token));
        }
    }

    let res = match req_builder.send().await {
        Ok(res) => res,
        Err(e) => {
            log_network_error("Refresh session (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = res.status().as_u16();

    if !res.status().is_success() {
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Sesi ditolak oleh server")
                .to_string()
        } else {
            "Sesi ditolak oleh server".to_string()
        };

        tracing::error!("Gagal refresh sesi (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: None,
            message: error_msg,
        });
    }

    let text_res = res.text().await?;
    let api_res: RefreshApiResponse = match serde_json::from_str(&text_res) {
        Ok(data) => data,
        Err(e) => {
            return Err(AppError::Unknown(format!(
                "Format JSON Refresh tidak sesuai: {}. Raw: {}",
                e, text_res
            )));
        }
    };

    let data = api_res.data.ok_or_else(|| {
        AppError::Unknown("Data token tidak ditemukan dari respons refresh".to_string())
    })?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let expires_at = now + data.expires_in;

    {
        let mut auth = state.auth.lock().await;
        auth.access_token = Some(data.access_token);
        auth.expires_at = expires_at;
    }

    tracing::info!("Proses penyegaran sesi berhasil diselesaikan.");
    Ok(())
}

pub async fn logout_session_service(state: &AppState) -> Result<bool, AppError> {
    tracing::info!("Memulai proses logout...");
    // 1. Ambil token dari state dan keyring
    let access_token = state.get_valid_token().await.unwrap_or_default();
    let refresh_token = crate::middlewares::auth_store::get_refresh_token().unwrap_or_default();

    // 2. Jika ada token, coba hubungi server Naufal untuk logout
    if !access_token.is_empty() && !refresh_token.is_empty() {
        use crate::models::auth_model::LogoutRequestPayload;
        let client = create_http_client();
        let payload = LogoutRequestPayload {
            rf_token: refresh_token,
        };

        // Fire and forget (kita tidak peduli sukses/gagal di sisi server)
        let _ = client
            .post(&format!("{}/auth/logout", API_BASE_URL))
            .header("Authorization", format!("Bearer {}", access_token))
            .json(&payload)
            .send()
            .await;
    }

    // 3. Paling krusial: Bersihkan semua jejak secara lokal (Pantang Gagal)
    cleanup_session_service(state).await;

    tracing::info!("Proses logout berhasil diselesaikan.");
    Ok(true)
}

fn decode_jwt_role(token: &str) -> String {
    use base64::Engine as _;
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() == 3 {
        // Coba baca JWT walau mungkin ada padding atau tidak
        let payload = parts[1];
        // Coba decode dengan URL_SAFE_NO_PAD
        let decoded_opt = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(payload)
            .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(payload));

        if let Ok(decoded) = decoded_opt {
            if let Ok(json_str) = String::from_utf8(decoded) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(r) = val.get("role") {
                        if let Some(s) = r.as_str() {
                            return s.to_string();
                        } else if let Some(i) = r.as_i64() {
                            return match i {
                                1 => "warga".to_string(),
                                2 => "admin".to_string(),
                                3 => "super admin".to_string(),
                                _ => "warga".to_string(),
                            };
                        }
                    }
                }
            }
        }
    }
    "warga".to_string() // default fallback
}

pub async fn forgot_password_service(state: &AppState, email: String) -> Result<bool, AppError> {
    tracing::info!("Memulai proses lupa kata sandi...");
    let client = create_http_client();
    let api_req = ForgotPasswordRequest {
        email: email.clone(),
    };

    let res = match client
        .post(&format!("{}/auth/forgot-password", API_BASE_URL))
        .json(&api_req)
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            log_network_error("Forgot password (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = res.status().as_u16();

    if !res.status().is_success() {
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal meminta OTP")
                .to_string()
        } else {
            "Gagal meminta OTP pada server".to_string()
        };

        tracing::error!("Gagal meminta OTP (HTTP {}): {}", http_status, error_msg);
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: None,
            message: error_msg,
        });
    }

    let text_res = match res.text().await {
        Ok(text) => text,
        Err(e) => {
            log_network_error("Forgot password (baca body)", &e);
            return Err(e.into());
        }
    };
    let api_res: ForgotPasswordApiResponse = match serde_json::from_str(&text_res) {
        Ok(data) => data,
        Err(e) => {
            return Err(AppError::Unknown(format!(
                "Format JSON Forgot Password tidak sesuai: {}. Raw: {}",
                e, text_res
            )));
        }
    };

    let data = api_res.data.ok_or_else(|| {
        AppError::Unknown("Data OTP tidak ditemukan dari respons server".to_string())
    })?;

    {
        let mut cache = state.otp_cache.lock().unwrap();
        cache.insert(email, (data.hash, data.expires_at));
    }

    tracing::info!("Proses lupa kata sandi (pengiriman OTP) berhasil diselesaikan.");
    Ok(true)
}

pub async fn reset_password_service(
    state: &AppState,
    email: String,
    otp: String,
    new_password: String,
    confirm_password: String,
) -> Result<bool, AppError> {
    tracing::info!("Memulai proses reset kata sandi...");
    if new_password != confirm_password {
        tracing::warn!("Gagal reset kata sandi: Kata sandi dan konfirmasi tidak cocok.");
        return Err(AppError::ValidationError(
            "Kata sandi dan konfirmasi tidak cocok.".to_string(),
        ));
    }

    let cache_data = state.otp_cache.lock().unwrap().remove(&email);
    let (hash, expires_at) = match cache_data {
        Some(data) => data,
        None => {
            // Kita kembalikan Unknown atau kita bisa tambah InvalidSession di AppError jika mau,
            // tapi sesuai instruksi atau menggunakan ValidationError saja.
            tracing::warn!(
                "Gagal reset kata sandi: Sesi OTP tidak ditemukan atau sudah kedaluwarsa."
            );
            return Err(AppError::ValidationError(
                "Sesi OTP tidak ditemukan atau sudah kedaluwarsa.".to_string(),
            ));
        }
    };

    let client = create_http_client();
    let api_req = ResetPasswordRequest {
        email,
        otp,
        new_password,
        hash,
        expires_at,
    };

    let res = match client
        .post(&format!("{}/auth/reset-password", API_BASE_URL))
        .json(&api_req)
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            log_network_error("Reset password (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = res.status().as_u16();

    if !res.status().is_success() {
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal mereset kata sandi")
                .to_string()
        } else {
            "Gagal mereset kata sandi pada server".to_string()
        };

        tracing::error!(
            "Gagal mereset kata sandi (HTTP {}): {}",
            http_status,
            error_msg
        );
        return Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: None,
            message: error_msg,
        });
    }

    tracing::info!("Proses reset kata sandi berhasil diselesaikan.");
    Ok(true)
}
