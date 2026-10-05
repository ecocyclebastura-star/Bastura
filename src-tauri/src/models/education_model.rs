use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct EducationContent {
    pub tags: Vec<String>,
    pub text: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EducationData {
    pub title: String,
    pub content: serde_json::Value,
    pub education_img: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EducationItem {
    pub id_content: String,
    pub data: EducationData,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EducationApiResponse {
    pub status: String,
    pub data: Vec<EducationItem>,
}

#[derive(Debug, Serialize, Clone)]
pub struct EducationClientResponse {
    pub id: String,
    pub title: String,
    pub content: EducationContent,
    pub image_url: Option<String>,
    pub image_base64: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AddEducationPayload {
    pub title: String,
    pub content: String,
    pub file_bytes: Option<Vec<u8>>,
    pub file_name: Option<String>,
    pub draft_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EditEducationPayload {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub file_bytes: Option<Vec<u8>>,
    pub file_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveEducationDraftPayload {
    pub draft_id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub file_bytes: Option<Vec<u8>>,
    pub file_name: Option<String>,
    pub remove_image: Option<bool>,
}

#[derive(Debug, Serialize, Clone)]
pub struct EducationDraftResponse {
    pub draft_id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub image_base64: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct EducationDraft {
    pub draft_id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub image_local_path: Option<String>,
    pub updated_at: String,
}
