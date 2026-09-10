use crate::models::schedule_model::ScheduleItem;
use crate::services::schedule_service::get_schedule_service;
use crate::{AppError, AppState};
use tauri::State;

#[tauri::command]
pub async fn get_jadwal_command(state: State<'_, AppState>) -> Result<Vec<ScheduleItem>, AppError> {
    get_schedule_service(&state).await
}

#[tauri::command]
pub async fn insert_jadwal_command(
    state: State<'_, AppState>,
    time: String,
) -> Result<crate::models::schedule_model::InsertJadwalResponseData, AppError> {
    crate::services::schedule_service::insert_jadwal_service(&state, time).await
}
