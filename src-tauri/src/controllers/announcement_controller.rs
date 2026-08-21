use tauri::State;
use crate::{AppError, AppState};
use crate::models::announcement_model::AnnouncementClientResponse;
use crate::services::announcement_service::fetch_announcements_service;

#[tauri::command]
pub async fn get_announcements_command(
    state: State<'_, AppState>,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AnnouncementClientResponse>, AppError> {
    fetch_announcements_service(&state, search, limit).await
}
