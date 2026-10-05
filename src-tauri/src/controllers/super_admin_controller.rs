use crate::middlewares::role_guard::require_super_admin;
use crate::services::super_admin_service::{demote_admin_service, promote_admin_service};
use crate::utils::error::AppError;
use crate::utils::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn promote_admin_command(
    state: State<'_, AppState>,
    id_user: String,
) -> Result<(), AppError> {
    let token = require_super_admin(&state).await?;
    promote_admin_service(&state, &token, id_user).await
}

#[tauri::command]
pub async fn demote_admin_command(
    state: State<'_, AppState>,
    id_user: String,
) -> Result<(), AppError> {
    let token = require_super_admin(&state).await?;
    demote_admin_service(&state, &token, id_user).await
}
