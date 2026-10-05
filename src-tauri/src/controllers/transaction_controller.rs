use crate::models::transaction_model::{TransactionHistoryPayload, TransactionResponseData};
use crate::services::transaction_service::fetch_transaction_history_service;
use crate::{AppError, AppState};
use tauri::State;

#[tauri::command]
pub async fn get_transaction_history_command(
    state: State<'_, AppState>,
    payload: TransactionHistoryPayload,
) -> Result<TransactionResponseData, AppError> {
    tracing::info!("Menjalankan command: get_transaction_history_command (Strict Network-First)");
    fetch_transaction_history_service(&state, payload).await
}

#[tauri::command]
pub async fn create_withdrawal_command(
    state: State<'_, AppState>,
    amount: i64,
) -> Result<crate::models::transaction_model::WithdrawalResponseData, AppError> {
    tracing::info!("Menjalankan command: create_withdrawal_command");
    crate::services::transaction_service::create_withdrawal_service(&state, amount).await
}

#[tauri::command]
pub async fn cancel_withdrawal_command(
    state: State<'_, AppState>,
    id_transaksi: String,
) -> Result<crate::models::transaction_model::CancelWithdrawalResponseData, AppError> {
    tracing::info!("Menjalankan command: cancel_withdrawal_command");
    crate::services::transaction_service::cancel_withdrawal_service(&state, id_transaksi).await
}

#[tauri::command]
pub async fn get_deposit_detail_command(
    state: State<'_, AppState>,
    id_deposit: String,
) -> Result<crate::models::transaction_model::DepositDetailData, AppError> {
    tracing::info!("Menjalankan command: get_deposit_detail_command");
    
    // 1. Otorisasi (Memastikan User adalah Admin / Super Admin)
    crate::middlewares::role_guard::require_admin(&state).await?;
    
    // 2. Lempar ke layer Service
    crate::services::transaction_service::get_deposit_detail_service(&state, id_deposit).await
}

#[tauri::command]
pub async fn add_deposit_command(
    state: State<'_, AppState>,
    payload: crate::models::transaction_model::AddDepositRequest,
) -> Result<(), AppError> {
    tracing::info!("Menjalankan command: add_deposit_command");
    
    // 1. Otorisasi (Memastikan User adalah Admin / Super Admin)
    crate::middlewares::role_guard::require_admin(&state).await?;
    
    // 2. Lempar ke layer Service
    crate::services::transaction_service::add_deposit_service(&state, payload).await
}

#[tauri::command]
pub async fn edit_deposit_command(
    state: State<'_, AppState>,
    payload: crate::models::transaction_model::EditDepositRequest,
) -> Result<(), AppError> {
    tracing::info!("Menjalankan command: edit_deposit_command");
    
    crate::middlewares::role_guard::require_admin(&state).await?;
    crate::services::transaction_service::edit_deposit_service(&state, payload).await
}

#[tauri::command]
pub async fn delete_deposit_command(
    state: State<'_, AppState>,
    id_deposit: String,
) -> Result<(), AppError> {
    tracing::info!("Menjalankan command: delete_deposit_command");
    
    crate::middlewares::role_guard::require_admin(&state).await?;
    crate::services::transaction_service::delete_deposit_service(&state, id_deposit).await
}
