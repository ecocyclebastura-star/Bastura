use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct SplitBillInitRequest {
    pub total_dana: i64,
    pub date_start: String,
    pub date_end: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AlokasiPreviewItem {
    pub id_user: String,
    pub name: String,
    pub email: String,
    pub total_weight: i64,
    pub total_value: i64,
    pub estimasi_alokasi: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InitSplitBillData {
    pub dana_setelah_pajak: i64,
    pub pajak: Option<i64>,
    pub admin_fee: Option<i64>,
    pub alokasi_preview: Vec<AlokasiPreviewItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InitSplitBillApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: InitSplitBillData,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfirmAlokasiItem {
    pub id_user: String,
    pub final_amount: i64,
}

#[derive(Debug, Serialize)]
pub struct SplitBillConfirmRequest {
    pub total_dana: i64,
    pub date_start: String,
    pub date_end: String,
    pub alokasi: Vec<ConfirmAlokasiItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SplitBillConfirmApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SplitBillHistoryItem {
    pub id_sb: String,
    #[serde(deserialize_with = "crate::models::transaction_model::deserialize_nominal", default)]
    pub total_sb: i64,
    pub date_start: String,
    pub date_end: String,
    pub status: String,
    pub processed_at: String,
    pub processed_by_name: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SplitBillHistoryApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: Vec<SplitBillHistoryItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SplitBillDetailItem {
    pub id_transaksi: String,
    pub id_user: Option<String>,
    pub id_users: Option<String>,
    pub jenis_transaksi: String,
    pub deskripsi: Option<String>,
    #[serde(deserialize_with = "crate::models::transaction_model::deserialize_nominal", default)]
    pub nominal: i64,
    pub status: String,
    pub tanggal_transaksi: String,
    pub name: Option<String>,
}
