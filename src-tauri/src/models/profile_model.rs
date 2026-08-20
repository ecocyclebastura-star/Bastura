use serde::Serialize;

/// Payload yang dikirim ke frontend Vue melalui event "on_balance_update".
#[derive(Serialize, Clone)]
pub struct BalanceUpdatePayload {
    pub saldo: i64,
    pub last_updated: String, // Format: Unix timestamp sebagai string ISO-like
}
