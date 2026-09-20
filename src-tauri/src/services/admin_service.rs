use crate::db::admin_queries::{get_cached_warga, upsert_warga_batch, update_warga_status_local};
use crate::middlewares::role_guard::require_admin;
use crate::models::admin_model::{
    AdminGetUserLogRequest, BlockWargaApiResponse, BlockWargaItem, UnblockWargaApiResponse,
    UnblockWargaItem, WargaApiResponse, WargaLocalItem,
};
use crate::utils::constants::API_BASE_URL;
use crate::utils::http::create_http_client;
use crate::AppError;
use crate::AppState;
use reqwest::header::AUTHORIZATION;

pub async fn sync_warga_from_server(state: &AppState) -> Result<(), AppError> {
    let token = state.get_valid_token().await?;

    let client = create_http_client();
    let url = format!("{}/users/account/warga", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => {
            if r.status().is_success() {
                r
            } else {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!(
                    "API /users/account merespons dengan status error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal mengambil data warga dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let api_response: WargaApiResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing respons JSON /users/account: {}", e);
            return Err(e.into());
        }
    };

    let mut local_items = Vec::new();
    for api_item in api_response.message.data {
        let balance_held = api_item
            .balance_held
            .unwrap_or_default()
            .parse::<i64>()
            .unwrap_or(0);
        let total_balance = api_item
            .total_balance
            .unwrap_or_default()
            .parse::<i64>()
            .unwrap_or(0);
        let total_weight = api_item
            .total_weight
            .unwrap_or_default()
            .parse::<i64>()
            .unwrap_or(0);

        local_items.push(WargaLocalItem {
            id_users: api_item.id_users,
            name: api_item.name,
            email: api_item.email,
            phone: api_item.phone,
            created_at: api_item.created_at,
            status_active: api_item.status_active,
            balance_held: Some(balance_held),
            total_balance: Some(total_balance),
            total_weight: Some(total_weight),
        });
    }

    if !local_items.is_empty() {
        if let Err(e) = upsert_warga_batch(&state.db, &local_items).await {
            tracing::error!("Gagal menyimpan batch warga ke SQLite: {}", e);
            return Err(e);
        }
        tracing::info!(
            "Berhasil sinkronisasi {} data warga ke SQLite.",
            local_items.len()
        );
    }

    Ok(())
}

pub async fn get_daftar_warga_service(
    state: &AppState,
    search_query: Option<String>,
) -> Result<Vec<WargaLocalItem>, AppError> {
    require_admin(state).await?;

    if let Err(e) = sync_warga_from_server(state).await {
        tracing::warn!(
            "Sinkronisasi warga dari server gagal (menggunakan data cache): {}",
            e
        );
    }

    get_cached_warga(&state.db, search_query).await
}

pub async fn block_warga_service(
    state: &AppState,
    target_user_id: String,
) -> Result<BlockWargaItem, AppError> {
    let token = require_admin(state).await?;

    let client = create_http_client();
    let url = format!("{}/users/account/warga/block/{}", API_BASE_URL, target_user_id);

    let res = client
        .patch(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => {
            if r.status().is_success() {
                r
            } else {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!(
                    "API /users/account/warga/block merespons dengan status error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal memblokir warga dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let api_response: BlockWargaApiResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing respons JSON: {}", e);
            return Err(e.into());
        }
    };

    if let Some(item) = api_response.data.data.first() {
        if let Err(e) = update_warga_status_local(&state.db, &target_user_id, "blocked").await {
            tracing::warn!("Gagal memperbarui status warga di cache lokal: {}", e);
        }
        Ok(item.clone())
    } else {
        Err(AppError::ApiError {
            http_status: 500,
            status: "error".to_string(),
            code: None,
            message: "Response data is empty".to_string(),
        })
    }
}

pub async fn unblock_warga_service(
    state: &AppState,
    target_user_id: String,
) -> Result<UnblockWargaItem, AppError> {
    let token = require_admin(state).await?;

    let client = create_http_client();
    let url = format!("{}/users/account/warga/unblock/{}", API_BASE_URL, target_user_id);

    let res = client
        .patch(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => {
            if r.status().is_success() {
                r
            } else {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!(
                    "API /users/account/warga/unblock merespons dengan status error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal membuka blokir warga dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let api_response: UnblockWargaApiResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing respons JSON: {}", e);
            return Err(e.into());
        }
    };

    let item = api_response.data.data;
    if let Err(e) = update_warga_status_local(&state.db, &target_user_id, "active").await {
        tracing::warn!("Gagal memperbarui status warga di cache lokal: {}", e);
    }
    
    Ok(item)
}

pub async fn get_user_transactions_admin_service(
    state: &AppState,
    target_user_id: String,
) -> Result<Vec<crate::models::transaction_model::TransactionItem>, AppError> {
    let token = require_admin(state).await?;

    let client = create_http_client();
    let url = format!("{}/transaction/transaction-logs/admin/user", API_BASE_URL);

    let payload = AdminGetUserLogRequest {
        user_id: target_user_id.clone(),
    };

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await;

    let response = match res {
        Ok(r) => {
            if r.status().is_success() {
                r
            } else {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!(
                    "API transaction-logs merespons dengan status error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal mengambil riwayat transaksi dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let api_response: crate::models::transaction_model::TransactionLogApiResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing respons JSON dari transaction-logs: {}", e);
            return Err(e.into());
        }
    };
    
    Ok(api_response.data.data)
}

pub async fn sync_global_transactions_from_server(state: &AppState) -> Result<(), AppError> {
    let token = require_admin(state).await?;

    let client = create_http_client();
    let url = format!("{}/transaction/transaction-logs/admin", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => {
            if r.status().is_success() {
                r
            } else {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!(
                    "API transaction-logs/admin merespons dengan status error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal mengambil riwayat transaksi global dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let api_response: crate::models::transaction_model::TransactionLogApiResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing respons JSON dari transaction-logs/admin: {}", e);
            return Err(e.into());
        }
    };

    let items = api_response.data.data;
    if !items.is_empty() {
        if let Err(e) = crate::db::admin_queries::upsert_transaksi_global_batch(&state.db, &items).await {
            tracing::error!("Gagal menyimpan batch transaksi global ke SQLite: {}", e);
            return Err(e);
        }
        tracing::info!("Berhasil sinkronisasi {} data transaksi global ke SQLite.", items.len());
    }

    Ok(())
}

pub async fn get_all_transactions_admin_service(
    state: &AppState,
) -> Result<Vec<crate::models::transaction_model::TransactionItem>, AppError> {
    require_admin(state).await?;

    // Call smart sync, if it fails, DO NOT RETURN CACHE (return the error directly)
    crate::services::sync_service::run_smart_sync_service(state).await?;

    crate::db::admin_queries::get_cached_transaksi_global(&state.db).await
}

pub async fn get_admin_withdrawals_service(
    state: &AppState,
) -> Result<Vec<crate::models::admin_model::AdminWithdrawalItem>, AppError> {
    let token = require_admin(state).await?;

    let client = create_http_client();
    let url = format!("{}/transaction/verify-withdrawal/admin", API_BASE_URL);

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    let response = match res {
        Ok(r) => {
            if r.status().is_success() {
                r
            } else {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!(
                    "API verify-withdrawal/admin merespons dengan status error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal mengambil daftar penarikan (withdrawals) dari server (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let api_response: crate::models::admin_model::AdminWithdrawalApiResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing respons JSON dari verify-withdrawal/admin: {}", e);
            return Err(e.into());
        }
    };

    Ok(api_response.data.data)
}

pub async fn verify_withdrawal_service(
    state: &AppState,
    id_tsc: String,
    is_approve: bool,
) -> Result<crate::models::admin_model::VerifyWithdrawalResult, AppError> {
    let token = require_admin(state).await?;

    let client = create_http_client();
    let url = format!("{}/transaction/verify-withdrawal/admin", API_BASE_URL);

    let p_type = if is_approve { "success".to_string() } else { "canceled".to_string() };

    let payload = crate::models::admin_model::VerifyWithdrawalRequest {
        id_tsc,
        proccess_type: p_type, // Mengikuti typo API Naufal
    };

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await;

    let response = match res {
        Ok(r) => {
            if r.status().is_success() {
                r
            } else {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!(
                    "API POST verify-withdrawal/admin merespons error: {} - {}",
                    status,
                    body_text
                );
                return Err(AppError::ApiError {
                    http_status: status.as_u16(),
                    status: "error".to_string(),
                    code: None,
                    message: format!("HTTP Status: {} - {}", status, body_text),
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                "Gagal melakukan verify withdrawal (Mungkin offline): {}",
                e
            );
            return Err(e.into());
        }
    };

    let api_response: crate::models::admin_model::VerifyWithdrawalApiResponse = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Gagal memparsing respons JSON verifikasi penarikan: {}", e);
            return Err(e.into());
        }
    };

    let balance_i64 = api_response.data.balance.unwrap_or_default().parse::<i64>().unwrap_or(0);

    Ok(crate::models::admin_model::VerifyWithdrawalResult {
        success: api_response.data.success.unwrap_or_default(),
        balance: balance_i64,
        id_users: api_response.data.id_users.unwrap_or_default(),
    })
}
