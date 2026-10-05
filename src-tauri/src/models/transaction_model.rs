use serde::{Deserialize, Deserializer, Serialize};

pub fn deserialize_nominal<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    match value {
        serde_json::Value::Null => Ok(0),
        serde_json::Value::Number(n) => n.as_i64().ok_or_else(|| serde::de::Error::custom("Invalid number")),
        serde_json::Value::String(s) => {
            if s.trim().is_empty() {
                Ok(0)
            } else {
                s.parse::<i64>().map_err(serde::de::Error::custom)
            }
        },
        _ => Err(serde::de::Error::custom("Expected string, number, or null for nominal")),
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
    #[sqlx(default)]
    #[serde(default)]
    pub name: Option<String>,
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

#[derive(Debug, Deserialize, Serialize)]
pub struct AddDepositRequest {
    pub user_id: String,
    pub category_id: String,
    pub weight_kg: f64,
    pub description: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EditDepositRequest {
    #[serde(skip_serializing)] 
    pub id_deposit: String,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>, 
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight_kg: Option<f64>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DepositDetailUser {
    pub id: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DepositDetailItem {
    pub id: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub catalog_name: Option<String>,
    pub description: Option<String>,
    pub weight_kg: Option<String>,
    pub unit: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DepositDetailData {
    pub id: String,
    pub user: DepositDetailUser,
    pub items: Vec<DepositDetailItem>,
    pub total_weight: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DepositDetailApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: DepositDetailData,
}
