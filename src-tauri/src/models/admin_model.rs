use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct WargaApiResponse {
    pub status: String,
    pub message: WargaMessageWrapper,
    pub data: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WargaMessageWrapper {
    pub data: Vec<WargaApiItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WargaApiItem {
    pub id_users: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub created_at: Option<String>,
    pub status_active: Option<String>,
    pub balance_held: Option<String>,
    pub total_balance: Option<String>,
    pub total_weight: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct WargaLocalItem {
    pub id_users: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub created_at: Option<String>,
    pub status_active: Option<String>,
    pub balance_held: Option<i64>,
    pub total_balance: Option<i64>,
    pub total_weight: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BlockWargaItem {
    pub id_users: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub status_active: Option<String>,
    pub blocked_at: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BlockWargaDataWrapper {
    pub data: Vec<BlockWargaItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BlockWargaApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: BlockWargaDataWrapper,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UnblockWargaItem {
    pub id_users: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub status_active: Option<String>,
    pub blocked_at: Option<String>,
    pub total_balance: Option<String>,
    pub balance_held: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UnblockWargaDataWrapper {
    pub data: UnblockWargaItem,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UnblockWargaApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: UnblockWargaDataWrapper,
}

#[derive(Debug, Serialize)]
pub struct AdminGetUserLogRequest {
    pub user_id: String,
}
