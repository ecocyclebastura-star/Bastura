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

// =============================================================================
// Model untuk Modul Profil Pengguna
// =============================================================================

#[derive(Serialize)]
pub struct UpdateBioRequest {
    #[serde(rename = "new_name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(rename = "new_phone", skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ProfileItem {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct ProfileDataWrapper {
    pub data: Vec<ProfileItem>,
}

#[derive(Deserialize, Debug)]
pub struct ProfileApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: ProfileDataWrapper,
}

#[derive(Serialize, Clone, Debug)]
pub struct ProfileClientResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub avatar_base64: Option<String>,
}
