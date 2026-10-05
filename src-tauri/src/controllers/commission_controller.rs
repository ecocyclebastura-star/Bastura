use crate::models::commission_model::{
    CommissionDetailResponse, CommissionSummaryResponse, UpdateCommissionFeeRequest,
    UpdateCommissionFeeResponse,
};
use crate::services::commission_service::{
    get_commission_detail_service, get_commission_summary_service, update_commission_fee_service,
};
use crate::utils::error::AppError;
use crate::utils::state::AppState;
use tauri::State;

/// IPC Command untuk mengambil ringkasan tarif komisi dan riwayat bulanan
#[tauri::command]
pub async fn get_commission_summary_command(
    state: State<'_, AppState>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<CommissionSummaryResponse, AppError> {
    get_commission_summary_service(&state, limit, offset).await
}

/// IPC Command untuk mengambil rincian segmen komisi per periode YYYY-MM
#[tauri::command]
pub async fn get_commission_detail_command(
    state: State<'_, AppState>,
    periode: String,
) -> Result<CommissionDetailResponse, AppError> {
    get_commission_detail_service(&state, periode).await
}

/// IPC Command untuk memperbarui persentase fee komisi dengan proteksi race condition
#[tauri::command]
pub async fn update_commission_fee_command(
    state: State<'_, AppState>,
    payload: UpdateCommissionFeeRequest,
) -> Result<UpdateCommissionFeeResponse, AppError> {
    update_commission_fee_service(&state, payload).await
}
