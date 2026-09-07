use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct WasteCatalogData {
    pub id_waste: String,
    pub name: String,
    pub category_id: i64,
    pub unit: String,
    pub price: String, // from JSON string
    pub description: Option<String>,
    pub catalog_img: Option<String>,
    pub updated_at: Option<String>,
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

#[derive(Debug, Serialize, Clone, sqlx::FromRow)]
pub struct CatalogItemLocal {
    pub id_waste: String,
    pub name: Option<String>,
    pub category_id: Option<i64>,
    pub unit: Option<String>,
    pub price: Option<i64>,
    pub description: Option<String>,
    pub catalog_img: Option<String>,
    pub image_base64: Option<String>,
}
