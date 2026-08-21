use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct EducationContent {
    pub tags: Vec<String>,
    pub text: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EducationData {
    pub title: String,
    pub content: EducationContent,
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
    pub created_at: String,
}
