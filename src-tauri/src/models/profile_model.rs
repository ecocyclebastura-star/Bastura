use serde::{Deserialize, Serialize};

/// Payload yang dikirim ke frontend Vue melalui event "on_balance_update".
#[derive(Serialize, Clone)]
pub struct BalanceUpdatePayload {
    pub saldo: i64,
    pub last_updated: String, // Format: ISO 8601 UTC
}

// =============================================================================
// Model untuk Deserialisasi Response API GET /transaction/balance
// =============================================================================

/// Field `data` dari response balance API.
/// `total_balance` bertipe String sesuai response server
/// (contoh: "0", "1500"). Parsing ke i64 dilakukan di service layer.
#[derive(Deserialize)]
pub struct BalanceData {
    pub total_balance: String,
}

/// Root response dari GET /transaction/balance.
/// Contoh JSON:
/// ```json
/// {
///   "status": "success",
///   "message": "Saldo berhasil diambil",
///   "code": "GET_BALANCE_SUCCESS",
///   "data": { "total_balance": "1500" }
/// }
/// ```
#[derive(Deserialize)]
pub struct BalanceApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: BalanceData,
}
