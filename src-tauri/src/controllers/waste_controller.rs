use crate::models::waste_model::CatalogItemLocal;
use crate::services::waste_service::fetch_catalog_service;
use crate::{AppError, AppState};
use tauri::State;

#[tauri::command]
pub async fn get_catalog_command(
    state: State<'_, AppState>,
    search_query: Option<String>,
    category_id: Option<i64>,
) -> Result<Vec<CatalogItemLocal>, AppError> {
    fetch_catalog_service(&state, search_query, category_id).await
}

#[tauri::command]
pub async fn add_catalog_with_photo_command(
    state: State<'_, AppState>,
    payload: crate::models::waste_model::AddCatalogRequest,
) -> Result<String, AppError> {
    let token = crate::middlewares::role_guard::require_admin(&state).await?;
    crate::services::waste_service::add_catalog_with_photo_service(&state, &token, payload).await
}

#[tauri::command]
pub async fn edit_catalog_command(
    state: State<'_, AppState>,
    payload: crate::models::waste_model::EditCatalogRequest,
) -> Result<String, AppError> {
    let token = crate::middlewares::role_guard::require_admin(&state).await?;
    crate::services::waste_service::edit_catalog_service(&state, &token, payload).await
}

#[tauri::command]
pub async fn delete_catalog_command(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let token = crate::middlewares::role_guard::require_admin(&state).await?;
    crate::services::waste_service::delete_catalog_service(&state, &token, id).await
}

#[tauri::command]
pub async fn get_waste_categories_command(
    state: State<'_, AppState>,
) -> Result<Vec<crate::models::waste_model::WasteCategory>, String> {
    let token = state.get_valid_token().await.map_err(|_| "Sesi tidak valid, silakan login kembali.".to_string())?;

    crate::services::waste_service::get_waste_categories_service(&state, &token)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scan_waste_ai_command(
    state: State<'_, AppState>,
    payload: crate::models::waste_model::ScanWasteAiRequest,
) -> Result<crate::models::waste_model::ScanWasteAiResponse, AppError> {
    crate::services::waste_service::scan_waste_ai_service(&state, payload).await
}
