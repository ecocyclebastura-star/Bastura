use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncData {
    pub profile_up: Option<String>,
    pub transaction_up: Option<String>,
    pub announcements_up: Option<String>,
    pub education_up: Option<String>,
    pub simba_up: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncApiResponse {
    pub status: String,
    pub data: SyncData,
}
