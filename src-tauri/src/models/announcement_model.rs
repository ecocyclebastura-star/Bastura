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
    pub content: AnnouncementContent,
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
    pub content: AnnouncementContent,
    pub image_url: Option<String>,
    pub created_at: String,
}
