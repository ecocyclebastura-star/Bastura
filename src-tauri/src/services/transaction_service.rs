use crate::db::profile_queries;
use crate::models::profile_model::BalanceApiResponse;
use crate::utils::{create_http_client, log_network_error, API_BASE_URL};
use crate::AppError;
use crate::AppState;

/// Ambil saldo terkini dari API, simpan ke SQLite, dan kembalikan nilainya.
///
/// Alur:
/// 1. Ambil access token yang valid dari AppState (RAM).
/// 2. Kirim GET request ke `/transaction/balance` dengan Bearer token.
/// 3. Parse JSON response ke `BalanceApiResponse`.
/// 4. Konversi `total_balance` (String dari server) ke `i64` secara aman.
/// 5. Simpan hasil ke tabel `profile_cache` di SQLite sebagai cache persisten.
/// 6. Kembalikan nilai saldo.
pub async fn fetch_real_balance(state: &AppState) -> Result<i64, AppError> {
    tracing::debug!("fetch_real_balance: Mengambil saldo dari API...");

    // 1. Ambil token valid dari RAM — propagate error jika tidak ada/expired
    let token = state.get_valid_token().await?;

    // 2. Kirim request ke API
    let client = create_http_client();
    let res = match client
        .get(&format!("{}/transaction/balance", API_BASE_URL))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            log_network_error("fetch_real_balance (kirim request)", &e);
            return Err(AppError::Network(e));
        }
    };

    let http_status = res.status().as_u16();

    // 3. Tangani HTTP error (non-2xx)
    if !res.status().is_success() {
        let error_msg = if let Ok(json) = res.json::<serde_json::Value>().await {
            json.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Gagal mengambil saldo dari server")
                .to_string()
        } else {
            "Gagal mengambil saldo dari server".to_string()
        };

        tracing::error!(
            "fetch_real_balance: Gagal (HTTP {}): {}",
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

    // 4. Parse JSON response
    let text_res = res.text().await.map_err(|e| {
        log_network_error("fetch_real_balance (baca body)", &e);
        AppError::Network(e)
    })?;

    let api_res: BalanceApiResponse = match serde_json::from_str(&text_res) {
        Ok(data) => data,
        Err(e) => {
            return Err(AppError::Unknown(format!(
                "fetch_real_balance: Format JSON tidak sesuai: {}. Raw: {}",
                e, text_res
            )));
        }
    };

    // 5. Konversi String → i64 secara aman (tidak akan panic)
    //    Jika server mengirim nilai yang tidak valid, fallback ke 0.
    let balance: i64 = api_res.data.total_balance.parse::<i64>().unwrap_or_else(|e| {
        tracing::warn!(
            "fetch_real_balance: Gagal parse total_balance '{}' ke i64: {}. Fallback ke 0.",
            api_res.data.total_balance,
            e
        );
        0
    });

    // 6. Simpan ke SQLite sebagai cache persisten
    profile_queries::update_user_balance(&state.db, balance).await?;

    tracing::debug!(
        "fetch_real_balance: Saldo berhasil diambil dan disimpan: {} IDR",
        balance
    );
    Ok(balance)
}
