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
    id_transaksi: i64,
) -> Result<crate::models::transaction_model::CancelWithdrawalResponseData, AppError> {
    tracing::info!("Menjalankan command: cancel_withdrawal_command");
    crate::services::transaction_service::cancel_withdrawal_service(&state, id_transaksi).await
}
