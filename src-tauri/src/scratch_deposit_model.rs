use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct AddDepositRequest {
    pub id_user: String,
    pub id_katalog: String,
    pub berat_kg: f64,
}
