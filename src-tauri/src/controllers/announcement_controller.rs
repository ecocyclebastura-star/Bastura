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
