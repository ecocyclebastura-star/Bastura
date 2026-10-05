use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SuperAdminApiResponse {
    pub status: String,
    pub message: String,
    pub code: Option<String>,
}
