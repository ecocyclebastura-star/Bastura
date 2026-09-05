use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct TransactionItem {
    pub id_transaksi: i64,
    pub jenis_transaksi: String,
    pub deskripsi: Option<String>,
    pub nominal: i64,
    pub status: String,
    pub tanggal_transaksi: String,
}

#[derive(Debug, Deserialize)]
pub struct TransactionLogDataWrapper {
    pub data: Vec<TransactionItem>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionLogApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: TransactionLogDataWrapper,
}

#[derive(Debug, Deserialize)]
pub struct TransactionHistoryPayload {
    pub limit: Option<u32>,
    pub cursor: Option<String>,
    pub jenis_transaksi: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TransactionResponseData {
    pub data: Vec<TransactionItem>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WithdrawalRequest {
    pub amount: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WithdrawalResponseData {
    pub id_wd: String,
    pub amount: i64,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct WithdrawalApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: Option<WithdrawalResponseData>,
}

#[derive(Debug, Serialize)]
pub struct CancelWithdrawalRequest {
    pub id_transaksi: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CancelWithdrawalResponseData {
    pub id_transaksi: i64,
    pub status: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CancelWithdrawalApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: CancelWithdrawalResponseData,
}
