use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct WasteCatalogData {
    pub id_waste: String,
    pub name: String,
    pub category_id: i64,
    pub category_name: Option<String>,
    pub unit: String,
    pub price: String, // from JSON string
    pub description: Option<String>,
    pub catalog_img: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WasteCatalogApiResponse {
    pub status: String,
    pub data: WasteCatalogDataWrapper,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WasteCatalogDataWrapper {
    pub data: Vec<WasteCatalogData>,
}

#[derive(serde::Deserialize, serde::Serialize, Debug)]
pub struct WasteCategory {
    pub id_waste_category: u32,
    pub category_name: String,
    pub ct_description: Option<String>,
}

#[derive(serde::Deserialize, Debug)]
pub struct WasteCategoryDataWrapper {
    pub data: Vec<WasteCategory>,
}

#[derive(serde::Deserialize, Debug)]
pub struct GetCategoriesApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: WasteCategoryDataWrapper,
}

#[derive(Debug, Serialize, Clone, sqlx::FromRow)]
pub struct CatalogItemLocal {
    pub id_waste: String,
    pub name: Option<String>,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub unit: Option<String>,
    pub price: Option<i64>,
    pub description: Option<String>,
    pub catalog_img: Option<String>,
    pub image_base64: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AddCatalogRequest {
    pub name: String,
    pub category_id: u32,
    pub unit: String,
    pub price: f64,
    pub description: Option<String>,
    pub file_name: Option<String>,
    pub file_bytes: Option<Vec<u8>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EditCatalogRequest {
    pub id: String,
    pub name: Option<String>,
    pub category_id: Option<u32>,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub description: Option<String>,
    pub file_name: Option<String>,
    pub file_bytes: Option<Vec<u8>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AddCatalogData {
    pub id_waste: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AddCatalogApiResponse {
    pub data: AddCatalogData,
}

#[derive(Debug, Deserialize)]
pub struct ScanWasteAiRequest {
    pub file_name: String,
    pub file_bytes: Vec<u8>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ScanWasteAiItem {
    pub catalog_id: Option<String>,
    pub name: String,
    pub condition: String,
    pub price_per_kg: f64,
    pub accepted: bool,
    pub confidence: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ScanWasteAiResponse {
    pub status: String,
    pub message: Option<String>,
    pub items: Vec<ScanWasteAiItem>,
    pub disclaimer: Option<String>,
}
