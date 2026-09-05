use crate::db::profile_queries;
use crate::db::transaction_queries::{get_cached_transaction_history, upsert_transactions};
use crate::models::profile_model::BalanceApiResponse;
use crate::models::transaction_model::TransactionLogApiResponse;
use crate::utils::{create_http_client, log_network_error, API_BASE_URL};
use crate::AppError;
use crate::AppState;
use reqwest::header::AUTHORIZATION;

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
    let balance: i64 = api_res
        .data
        .total_balance
        .parse::<i64>()
        .unwrap_or_else(|e| {
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

pub async fn sync_transaction_log_from_server(state: &AppState) -> Result<(), AppError> {
    tracing::info!("Menarik data riwayat transaksi dari server...");

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/transaction/transaction-log", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Sync Transaction Log (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = response.status().as_u16();

    if response.status().is_success() {
        let api_response = match response.json::<TransactionLogApiResponse>().await {
            Ok(data) => data,
            Err(e) => {
                tracing::error!("Gagal memparsing JSON /transaction/transaction-log: {}", e);
                return Err(e.into());
            }
        };

        upsert_transactions(&state.db, &api_response.data.data).await?;
        tracing::info!(
            "Berhasil menyimpan {} data transaksi ke SQLite.",
            api_response.data.data.len()
        );
        Ok(())
    } else {
        // Cek response body untuk error handling, terutama jika DATA_NOT_FOUND
        let body_json = response.json::<serde_json::Value>().await.ok();
        let code = body_json
            .as_ref()
            .and_then(|v| v.get("code"))
            .and_then(|c| c.as_str());

        let message = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("Gagal mengambil riwayat transaksi dari server")
            .to_string();

        if code == Some("DATA_NOT_FOUND")
            || (http_status == 404 && message.to_lowercase().contains("tidak ditemukan"))
        {
            tracing::info!("Riwayat transaksi kosong (DATA_NOT_FOUND / 404). Mengosongkan cache.");
            upsert_transactions(&state.db, &[]).await?;
            return Ok(());
        }

        tracing::error!(
            "Gagal mengambil riwayat transaksi (HTTP {}): {}",
            http_status,
            message
        );

        Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: code.map(|s| s.to_string()),
            message,
        })
    }
}

pub async fn fetch_transaction_history_service(
    state: &AppState,
    payload: crate::models::transaction_model::TransactionHistoryPayload,
) -> Result<crate::models::transaction_model::TransactionResponseData, AppError> {
    tracing::info!("Mengambil data riwayat transaksi (Strict Network-First)...");

    // Jika cursor None (fetch awal / refresh / perubahan filter):
    // Validasi langsung ke server via GET /transaction/transaction-log (Strict: langsung error jika offline/gagal koneksi)
    if payload.cursor.is_none() {
        sync_transaction_log_from_server(state).await?;
        let _ = sqlx::query(
            "INSERT INTO local_sync_logs (sync_category, last_synced_at) VALUES ('transaction', datetime('now')) ON CONFLICT(sync_category) DO UPDATE SET last_synced_at = excluded.last_synced_at",
        )
        .execute(&state.db)
        .await;
    }

    // 2. Proyeksikan data dari cache lokal SQLite
    let data = get_cached_transaction_history(&state.db, payload).await?;
    Ok(data)
}

pub async fn create_withdrawal_service(
    state: &AppState,
    amount: i64,
) -> Result<crate::models::transaction_model::WithdrawalResponseData, AppError> {
    tracing::info!("Memproses pengajuan penarikan saldo sebesar {} IDR...", amount);

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/transaction/withdrawal", API_BASE_URL);

    let payload = crate::models::transaction_model::WithdrawalRequest { amount };

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Pengajuan Penarikan (kirim request)", &e);
            return Err(e.into());
        }
    };

    let http_status = response.status().as_u16();

    if response.status().is_success() {
        let api_response = match response.json::<crate::models::transaction_model::WithdrawalApiResponse>().await {
            Ok(data) => data,
            Err(e) => {
                tracing::error!("Gagal memparsing JSON /transaction/withdrawal: {}", e);
                return Err(e.into());
            }
        };

        if let Some(data) = api_response.data {
            tracing::info!("Penarikan berhasil diajukan dengan ID: {}", data.id_wd);
            
            // Panggil paksa sinkronisasi saldo agar UI langsung update tanpa tunggu 60 detik
            let state_clone = state.clone();
            tauri::async_runtime::spawn(async move {
                crate::services::balance_worker::force_fetch_and_emit_balance(&state_clone).await;
            });

            Ok(data)
        } else {
            Err(AppError::Unknown("Berhasil tetapi data dari server kosong".to_string()))
        }
    } else {
        let body_json = response.json::<serde_json::Value>().await.ok();
        let code = body_json
            .as_ref()
            .and_then(|v| v.get("code"))
            .and_then(|c| c.as_str());

        let message = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("Gagal mengajukan penarikan saldo")
            .to_string();

        tracing::error!(
            "Gagal mengajukan penarikan (HTTP {}): {}",
            http_status,
            message
        );

        Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: code.map(|s| s.to_string()),
            message,
        })
    }
}

pub async fn cancel_withdrawal_service(
    state: &AppState,
    id_transaksi: i64,
) -> Result<crate::models::transaction_model::CancelWithdrawalResponseData, AppError> {
    tracing::info!(
        "Memproses pembatalan penarikan saldo untuk id_transaksi: {}",
        id_transaksi
    );

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/transaction/withdrawal/cancel", API_BASE_URL);

    let payload = crate::models::transaction_model::CancelWithdrawalRequest { id_transaksi };

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Pembatalan Penarikan (kirim request)", &e);
            return Err(AppError::Network(e));
        }
    };

    let http_status = response.status().as_u16();

    if response.status().is_success() {
        let api_response = match response
            .json::<crate::models::transaction_model::CancelWithdrawalApiResponse>()
            .await
        {
            Ok(data) => data,
            Err(e) => {
                tracing::error!("Gagal memparsing JSON /transaction/withdrawal/cancel: {}", e);
                return Err(e.into());
            }
        };

        let data = api_response.data;

        tracing::info!(
            "Pembatalan penarikan berhasil untuk id_transaksi: {}, status baru: {}",
            data.id_transaksi,
            data.status
        );

        // a. Update status di SQLite cache lokal secara optimistis
        if let Err(e) = crate::db::transaction_queries::update_transaction_status(
            &state.db,
            id_transaksi,
            "canceled",
        )
        .await
        {
            // Non-fatal: cache lokal tidak terupdate, tapi transaksi di server sudah dibatalkan
            tracing::warn!(
                "Gagal update status lokal untuk id_transaksi {}: {}. Data akan sinkron saat refresh berikutnya.",
                id_transaksi,
                e
            );
        }

        // b. Trigger pembaruan saldo instan karena dana yang dibatalkan kembali ke saldo
        let state_clone = state.clone();
        tauri::async_runtime::spawn(async move {
            crate::services::balance_worker::force_fetch_and_emit_balance(&state_clone).await;
        });

        Ok(data)
    } else {
        let body_json = response.json::<serde_json::Value>().await.ok();
        let code = body_json
            .as_ref()
            .and_then(|v| v.get("code"))
            .and_then(|c| c.as_str());

        let message = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("Gagal membatalkan penarikan saldo")
            .to_string();

        tracing::error!(
            "Gagal membatalkan penarikan (HTTP {}): {}",
            http_status,
            message
        );

        Err(AppError::ApiError {
            http_status,
            status: "error".to_string(),
            code: code.map(|s| s.to_string()),
            message,
        })
    }
}
