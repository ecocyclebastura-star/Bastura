use crate::models::education_model::EducationClientResponse;
use crate::services::education_service::fetch_education_service;
use crate::{AppError, AppState};
use tauri::State;

#[tauri::command]
pub async fn get_education_command(
    state: State<'_, AppState>,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<EducationClientResponse>, AppError> {
    fetch_education_service(&state, search, limit).await
}
