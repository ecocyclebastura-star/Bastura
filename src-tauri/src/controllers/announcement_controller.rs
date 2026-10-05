use crate::models::announcement_model::AnnouncementClientResponse;
use crate::services::announcement_service::fetch_announcements_service;
use crate::{AppError, AppState};
use tauri::State;

#[tauri::command]
pub async fn get_announcements_command(
    state: State<'_, AppState>,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AnnouncementClientResponse>, AppError> {
    fetch_announcements_service(&state, search, limit).await
}

#[tauri::command]
pub async fn add_announcement_command(
    state: State<'_, AppState>,
    payload: crate::models::announcement_model::AddAnnouncementPayload,
) -> Result<String, AppError> {
    crate::services::announcement_service::add_announcement_service(&state, payload).await
}

#[tauri::command]
pub async fn edit_announcement_command(
    state: State<'_, AppState>,
    payload: crate::models::announcement_model::EditAnnouncementPayload,
) -> Result<String, AppError> {
    crate::services::announcement_service::edit_announcement_service(&state, payload).await
}

#[tauri::command]
pub async fn delete_announcement_command(
    state: State<'_, AppState>,
    id: String,
) -> Result<String, AppError> {
    crate::services::announcement_service::delete_announcement_service(&state, id).await
}

#[tauri::command]
pub async fn save_draft_announcement_command(
    state: State<'_, AppState>,
    draft: crate::models::announcement_model::SaveAnnouncementDraftPayload,
) -> Result<String, AppError> {
    crate::services::announcement_service::save_draft_announcement_service(&state, draft).await
}

#[tauri::command]
pub async fn get_draft_announcements_command(
    state: State<'_, AppState>,
) -> Result<Vec<crate::models::announcement_model::AnnouncementDraftResponse>, AppError> {
    crate::services::announcement_service::get_draft_announcements_service(&state).await
}

#[tauri::command]
pub async fn delete_draft_announcement_command(
    state: State<'_, AppState>,
    draft_id: String,
) -> Result<String, AppError> {
    crate::services::announcement_service::delete_draft_announcement_service(&state, draft_id).await
}

#[tauri::command]
pub async fn get_announcement_categories_command(
    state: State<'_, AppState>,
) -> Result<Vec<crate::models::announcement_model::AnnouncementCategory>, AppError> {
    crate::services::announcement_service::get_announcement_categories_service(&state).await
}

