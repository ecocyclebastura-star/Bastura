use crate::AppError;
use crate::models::auth_model::{LoginRequestPayload, LoginSuccessResponse, SignupRequestPayload};
use crate::services::auth_service::{login_service, logout_session_service, signup_service};
use crate::AppState;

#[tauri::command]
pub async fn login_command(
    state: tauri::State<'_, AppState>,
    email: String,
    password: String,
) -> Result<LoginSuccessResponse, AppError> {
    let payload = LoginRequestPayload { email, password };
    login_service(&state, payload).await
}

#[tauri::command]
pub async fn logout_command(
    state: tauri::State<'_, AppState>,
) -> Result<bool, AppError> {
    logout_session_service(&state).await
}

#[tauri::command]
pub async fn signup_command(
    state: tauri::State<'_, AppState>,
    payload: SignupRequestPayload,
) -> Result<LoginSuccessResponse, AppError> {
    signup_service(&state, payload).await
}
