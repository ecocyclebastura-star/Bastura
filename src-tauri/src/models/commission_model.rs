use serde::{Deserialize, Serialize};

/// Item riwayat komisi per bulan pada Ringkasan Komisi
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CommissionHistoryItem {
    pub periode: String,
    pub total_dana: serde_json::Value,
    pub total_profit: serde_json::Value,
    pub percentage_label: Option<String>,
}

/// Data ringkasan komisi dari backend
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CommissionSummaryData {
    pub current_fee_percentage: serde_json::Value,
    pub current_month_total_dana: Option<serde_json::Value>,
    pub current_month_profit: Option<serde_json::Value>,
    #[serde(default)]
    pub history: Vec<CommissionHistoryItem>,
}

/// Respons API Ringkasan Komisi
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CommissionSummaryResponse {
    pub status: String,
    pub message: Option<String>,
    pub data: CommissionSummaryData,
}

/// Item segmen komisi per persentase pada Rincian Komisi Bulanan
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CommissionSegmentItem {
    pub percentage: serde_json::Value,
    pub total_fund: serde_json::Value,
    pub commission: serde_json::Value,
}

/// Data detail komisi per periode tertentu
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CommissionDetailData {
    pub periode: String,
    pub total_dana: serde_json::Value,
    pub total_profit: serde_json::Value,
    #[serde(default)]
    pub segments: Vec<CommissionSegmentItem>,
}

/// Respons API Rincian Komisi Bulanan
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CommissionDetailResponse {
    pub status: String,
    pub message: Option<String>,
    pub data: CommissionDetailData,
}

/// Payload dari Frontend untuk memperbarui persentase fee komisi
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UpdateCommissionFeeRequest {
    pub new_fee: String,
    pub old_fee: String,
}

/// Respons pembaruan fee komisi
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UpdateCommissionFeeResponse {
    pub status: String,
    pub message: Option<String>,
}
