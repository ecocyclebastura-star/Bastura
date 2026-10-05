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
/// 4. Ambil `total_balance` (i64 dari server).
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

    // 5. Ambil nilai i64
    let balance: i64 = api_res.data.total_balance;

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
    if amount < 10_000 {
        return Err(AppError::Unknown(
            "Nominal penarikan tidak boleh kurang dari Rp10.000".to_string(),
        ));
    }

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

        let data = api_response.data.unwrap_or_else(|| {
            crate::models::transaction_model::WithdrawalResponseData {
                id_wd: "".to_string(),
                amount,
                status: "processed".to_string(),
                created_at: "".to_string(),
            }
        });

        tracing::info!("Penarikan berhasil diajukan.");
        
        // Panggil paksa sinkronisasi saldo agar UI langsung update tanpa tunggu 60 detik
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
    id_transaksi: String,
) -> Result<crate::models::transaction_model::CancelWithdrawalResponseData, AppError> {
    tracing::info!(
        "Memproses pembatalan penarikan saldo untuk id_transaksi: {}",
        id_transaksi
    );

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/transaction/withdrawal/cancel", API_BASE_URL);

    let payload = crate::models::transaction_model::CancelWithdrawalRequest { id_transaksi: id_transaksi.clone() };

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

        let data = api_response.data.unwrap_or_else(|| {
            crate::models::transaction_model::CancelWithdrawalResponseData {
                id_transaksi: id_transaksi.clone(),
                status: "canceled".to_string(),
                updated_at: "".to_string(),
            }
        });

        tracing::info!(
            "Pembatalan penarikan berhasil untuk id_transaksi: {}",
            id_transaksi
        );

        // a. Update status di SQLite cache lokal secara optimistis
        if let Err(e) = crate::db::transaction_queries::update_transaction_status(
            &state.db,
            &id_transaksi,
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

pub async fn add_deposit_service(
    state: &AppState,
    payload: crate::models::transaction_model::AddDepositRequest,
) -> Result<(), AppError> {
    // 1. Zero-Trust Validation (Lokal)
    if payload.weight_kg <= 0.0 {
        return Err(AppError::ValidationError(
            "Kuantitas / Berat sampah harus lebih dari 0.".to_string(),
        ));
    }
    if payload.user_id.trim().is_empty() {
        return Err(AppError::ValidationError(
            "ID User tidak boleh kosong.".to_string(),
        ));
    }

    tracing::info!("Memproses transaksi setoran sampah untuk user: {}", payload.user_id);

    // 2. Ekstraksi Token
    let token = state.get_valid_token().await?;
    
    // 3. HTTP Client Request
    let client = create_http_client();
    let url = format!("{}/deposits", API_BASE_URL);

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Tambah Setoran (kirim request)", &e);
            return Err(AppError::Network(e));
        }
    };

    let http_status = response.status().as_u16();

    // 4. Error Handling Presisi
    if response.status().is_success() {
        tracing::info!("Setoran sampah berhasil ditambahkan.");
        Ok(())
    } else {
        let body_json = response.json::<serde_json::Value>().await.ok();
        let code = body_json
            .as_ref()
            .and_then(|v| v.get("code"))
            .and_then(|c| c.as_str());

        let fallback_msg = match http_status {
            404 => "Gagal: Warga atau jenis sampah tidak ditemukan.",
            403 | 401 => "Sesi tidak valid atau akses ditolak.",
            _ => "Gagal menambahkan setoran sampah.",
        };

        let message = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or(fallback_msg)
            .to_string();

        tracing::error!(
            "Gagal tambah setoran (HTTP {}): {}",
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

pub async fn edit_deposit_service(
    state: &AppState,
    payload: crate::models::transaction_model::EditDepositRequest,
) -> Result<(), AppError> {
    // 1. Zero-Trust Validation (Lokal)
    if payload.id_deposit.trim().is_empty() {
        return Err(AppError::ValidationError(
            "ID Deposit tidak boleh kosong.".to_string(),
        ));
    }

    if let Some(berat) = payload.weight_kg {
        if berat <= 0.0 {
            return Err(AppError::ValidationError(
                "Kuantitas / Berat sampah revisi harus lebih dari 0.".to_string(),
            ));
        }
    }

    if payload.category_id.is_none() && payload.weight_kg.is_none() && payload.description.is_none() {
        return Err(AppError::ValidationError(
            "Tidak ada data yang diubah.".to_string(),
        ));
    }

    tracing::info!("Mengedit transaksi setoran sampah: {}", payload.id_deposit);

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/deposits/{}", API_BASE_URL, payload.id_deposit);

    let res = client
        .patch(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Edit Setoran (kirim request)", &e);
            return Err(AppError::Network(e));
        }
    };

    let http_status = response.status().as_u16();

    if response.status().is_success() {
        tracing::info!("Setoran sampah berhasil diedit.");
        Ok(())
    } else {
        let body_json = response.json::<serde_json::Value>().await.ok();
        let fallback_msg = match http_status {
            404 => "Gagal: Transaksi setoran tidak ditemukan.",
            400 => "Gagal: Request tidak valid.",
            403 | 401 => "Sesi tidak valid atau akses ditolak.",
            _ => "Gagal mengedit setoran sampah.",
        };

        let message = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or(fallback_msg)
            .to_string();

        tracing::error!("Gagal edit setoran (HTTP {}): {}", http_status, message);
        Err(AppError::ValidationError(message))
    }
}

pub async fn delete_deposit_service(
    state: &AppState,
    id_deposit: String,
) -> Result<(), AppError> {
    if id_deposit.trim().is_empty() {
        return Err(AppError::ValidationError(
            "ID Deposit tidak boleh kosong.".to_string(),
        ));
    }

    tracing::info!("Menghapus transaksi setoran sampah: {}", id_deposit);

    let token = state.get_valid_token().await?;
    let client = create_http_client();
    let url = format!("{}/deposits/{}", API_BASE_URL, id_deposit);

    let res = client
        .delete(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => r,
        Err(e) => {
            log_network_error("Hapus Setoran (kirim request)", &e);
            return Err(AppError::Network(e));
        }
    };

    let http_status = response.status().as_u16();

    if response.status().is_success() {
        tracing::info!("Setoran sampah berhasil dihapus.");
        Ok(())
    } else {
        let body_json = response.json::<serde_json::Value>().await.ok();
        let fallback_msg = match http_status {
            404 => "Gagal: Transaksi setoran tidak ditemukan atau sudah dihapus sebelumnya.",
            403 | 401 => "Sesi tidak valid atau akses ditolak.",
            _ => "Gagal menghapus setoran sampah.",
        };

        let message = body_json
            .as_ref()
            .and_then(|v| v.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or(fallback_msg)
            .to_string();

        tracing::error!("Gagal hapus setoran (HTTP {}): {}", http_status, message);
        Err(AppError::ValidationError(message))
    }
}
