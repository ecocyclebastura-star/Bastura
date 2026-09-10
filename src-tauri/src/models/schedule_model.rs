use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScheduleItem {
    pub id_jadwal: i64,
    pub setor_time: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize, Debug)]
pub struct ScheduleDataWrapper {
    pub data: Vec<ScheduleItem>,
}

#[derive(Deserialize, Debug)]
pub struct ScheduleApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: ScheduleDataWrapper,
}

// =============================================================================
// Model untuk Insert Jadwal
// =============================================================================

#[derive(Serialize)]
pub struct InsertJadwalRequest {
    pub time: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InsertJadwalResponseData {
    pub setor_time: String,
}

#[derive(Deserialize, Debug)]
pub struct InsertJadwalDataWrapper {
    pub data: InsertJadwalResponseData,
}

#[derive(Deserialize, Debug)]
pub struct InsertJadwalApiResponse {
    pub status: String,
    pub message: String,
    pub code: String,
    pub data: InsertJadwalDataWrapper,
}
