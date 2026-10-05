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

#[tauri::command]
pub async fn add_education_command(
    state: State<'_, AppState>,
    payload: crate::models::education_model::AddEducationPayload,
) -> Result<String, AppError> {
    crate::services::education_service::add_education_service(&state, payload).await
}

#[tauri::command]
pub async fn edit_education_command(
    state: State<'_, AppState>,
    payload: crate::models::education_model::EditEducationPayload,
) -> Result<String, AppError> {
    crate::services::education_service::edit_education_service(&state, payload).await
}

#[tauri::command]
pub async fn delete_education_command(
    state: State<'_, AppState>,
    id: String,
) -> Result<String, AppError> {
    crate::services::education_service::delete_education_service(&state, &id).await
}

#[tauri::command]
pub async fn save_draft_education_command(
    state: State<'_, AppState>,
    payload: crate::models::education_model::SaveEducationDraftPayload,
) -> Result<String, AppError> {
    crate::services::education_service::save_draft_education_service(&state, payload).await
}

#[tauri::command]
pub async fn get_draft_educations_command(
    state: State<'_, AppState>,
) -> Result<Vec<crate::models::education_model::EducationDraftResponse>, AppError> {
    crate::services::education_service::get_draft_educations_service(&state).await
}

#[tauri::command]
pub async fn delete_draft_education_command(
    state: State<'_, AppState>,
    draft_id: String,
) -> Result<String, AppError> {
    crate::services::education_service::delete_draft_education_service(&state, &draft_id).await
}
