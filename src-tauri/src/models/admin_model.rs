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

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AdminWithdrawalItem {
    pub id_transaksi: String,
    pub id_user: String,
    pub name: String,
    pub jenis_transaksi: String,
    pub deskripsi: Option<String>,
    #[serde(deserialize_with = "crate::models::transaction_model::deserialize_nominal")]
    pub nominal: i64,
    pub status: String,
    pub tanggal_transaksi: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AdminWithdrawalDataWrapper {
    pub data: Vec<AdminWithdrawalItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AdminWithdrawalApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: AdminWithdrawalDataWrapper,
}

#[derive(Debug, Serialize)]
pub struct VerifyWithdrawalRequest {
    pub id_tsc: String,
    pub proccess_type: String, // Typo API Naufal dipertahankan
}

#[derive(Debug, Deserialize)]
pub struct VerifyWithdrawalData {
    pub success: Option<String>,
    pub balance: Option<String>,
    pub id_users: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VerifyWithdrawalApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: VerifyWithdrawalData,
}

#[derive(Debug, Serialize)]
pub struct VerifyWithdrawalResult {
    pub success: String,
    pub balance: i64,
    pub id_users: String,
}
