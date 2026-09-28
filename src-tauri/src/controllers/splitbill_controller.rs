use crate::models::splitbill_model::*;
use crate::services::splitbill_service::*;
use crate::middlewares::role_guard::require_admin;
use crate::utils::error::AppError;
use crate::utils::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn init_splitbill_command(
    state: State<'_, AppState>,
    total_dana: i64,
    date_start: String,
    date_end: String,
) -> Result<InitSplitBillData, AppError> {
    let token = require_admin(&state).await?;
    let req = SplitBillInitRequest {
        total_dana,
        date_start,
        date_end,
    };
    init_splitbill_service(&state, &token, req).await
}

#[tauri::command]
pub async fn confirm_splitbill_command(
    state: State<'_, AppState>,
    total_dana: i64,
    date_start: String,
    date_end: String,
    alokasi: Vec<ConfirmAlokasiItem>,
) -> Result<String, AppError> {
    let token = require_admin(&state).await?;
    let req = SplitBillConfirmRequest {
        total_dana,
        date_start,
        date_end,
        alokasi,
    };
    confirm_splitbill_service(&state, &token, req).await
}

#[tauri::command]
pub async fn get_splitbill_history_command(
    state: State<'_, AppState>,
) -> Result<Vec<SplitBillHistoryItem>, AppError> {
    let token = require_admin(&state).await?;
    history_splitbill_service(&state, &token).await
}

#[tauri::command]
pub async fn get_user_splitbill_detail_command(
    state: State<'_, AppState>,
    target_user_id: String,
    alokasi_baru: i64,
) -> Result<Vec<SplitBillDetailItem>, AppError> {
    let token = require_admin(&state).await?;
    get_user_splitbill_detail_service(
        &state,
        &token,
        target_user_id,
        alokasi_baru,
    )
    .await
}
