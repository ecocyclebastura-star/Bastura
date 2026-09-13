use crate::AppError;
use crate::AppState;
use crate::models::admin_model::{BlockWargaItem, UnblockWargaItem, WargaLocalItem};
use crate::models::transaction_model::TransactionItem;
use crate::services::admin_service::{
    block_warga_service, get_daftar_warga_service, get_user_transactions_admin_service,
    unblock_warga_service,
};
use tauri::State;

#[tauri::command]
pub async fn get_daftar_warga_command(
    state: State<'_, AppState>,
    search_query: Option<String>,
) -> Result<Vec<WargaLocalItem>, AppError> {
    get_daftar_warga_service(&state, search_query).await
}

#[tauri::command]
pub async fn block_warga_command(
    state: State<'_, AppState>,
    target_user_id: String,
) -> Result<BlockWargaItem, AppError> {
    block_warga_service(&state, target_user_id).await
}

#[tauri::command]
pub async fn unblock_warga_command(
    state: State<'_, AppState>,
    target_user_id: String,
) -> Result<UnblockWargaItem, AppError> {
    unblock_warga_service(&state, target_user_id).await
}

#[tauri::command]
pub async fn get_user_transactions_admin_command(
    state: State<'_, AppState>,
    target_user_id: String,
) -> Result<Vec<TransactionItem>, AppError> {
    get_user_transactions_admin_service(&state, target_user_id).await
}
