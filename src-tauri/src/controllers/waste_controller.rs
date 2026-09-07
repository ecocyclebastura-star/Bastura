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
