use serde::{Deserialize, Deserializer, Serialize};

fn deserialize_nominal<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    match value {
        serde_json::Value::Number(n) => n.as_i64().ok_or_else(|| serde::de::Error::custom("Invalid number")),
        serde_json::Value::String(s) => s.parse::<i64>().map_err(serde::de::Error::custom),
        _ => Err(serde::de::Error::custom("Expected string or number for nominal")),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct TransactionItem {
    pub id_transaksi: String,
    pub jenis_transaksi: String,
    pub deskripsi: Option<String>,
    #[serde(deserialize_with = "deserialize_nominal")]
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
    pub id_transaksi: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CancelWithdrawalResponseData {
    pub id_transaksi: String,
    pub status: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CancelWithdrawalApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: Option<CancelWithdrawalResponseData>,
}
