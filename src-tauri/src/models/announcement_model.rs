use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AnnouncementContent {
    pub text: String,
    pub author: String,
    pub important: bool,
}

#[derive(Debug, Deserialize)]
pub struct AnnouncementData {
    pub title: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub content: serde_json::Value,
    pub announcements_img: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AnnouncementItem {
    pub id_announcements: String,
    pub data: AnnouncementData,
}

#[derive(Debug, Deserialize)]
pub struct AnnouncementApiResponse {
    pub status: String,
    pub data: Vec<AnnouncementItem>,
}

#[derive(Debug, Serialize, Clone)]
pub struct AnnouncementClientResponse {
    pub id: String,
    pub title: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub content: AnnouncementContent,
    pub image_url: Option<String>,
    pub image_base64: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct AnnouncementDraft {
    pub draft_id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub category_id: Option<String>,
    pub image_local_path: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AddAnnouncementPayload {
    pub title: String,
    pub content: String,
    pub category_id: String,
    pub file_bytes: Option<Vec<u8>>,
    pub file_name: Option<String>,
    pub draft_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EditAnnouncementPayload {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub category_id: Option<String>,
    pub file_bytes: Option<Vec<u8>>,
    pub file_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnnouncementCategory {
    pub id_category: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveAnnouncementDraftPayload {
    pub draft_id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub category_id: Option<String>,
    pub file_bytes: Option<Vec<u8>>,
    pub file_name: Option<String>,
    pub remove_image: Option<bool>,
}

#[derive(Debug, Serialize, Clone)]
pub struct AnnouncementDraftResponse {
    pub draft_id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub category_id: Option<String>,
    pub image_base64: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AnnouncementCategoryApiResponse {
    pub status: String,
    pub data: Vec<AnnouncementCategory>,
}
