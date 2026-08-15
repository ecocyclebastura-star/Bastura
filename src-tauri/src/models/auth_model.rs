use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize, Debug)]
pub struct ApiUser {
    pub id: String,
    pub name: String,
    pub email: String,
}

#[derive(Deserialize, Debug)]
pub struct ApiTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

#[derive(Deserialize, Debug)]
pub struct ApiData {
    pub user: ApiUser,
    pub tokens: ApiTokens,
}

#[derive(Deserialize, Debug)]
pub struct LoginApiResponse {
    pub status: String,
    pub message: String,
    pub data: Option<ApiData>,
}

#[derive(Serialize)]
pub struct LoginSuccessResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Deserialize, Debug)]
pub struct RefreshData {
    pub access_token: String,
    pub expires_in: i64,
}

#[derive(Deserialize, Debug)]
pub struct RefreshApiResponse {
    pub status: String,
    pub message: String,
    pub data: Option<RefreshData>,
}

#[derive(Deserialize)]
pub struct LoginRequestPayload {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LogoutRequestPayload {
    pub rf_token: String,
}

#[derive(Deserialize)]
pub struct SignupRequestPayload {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub password: String,
    pub confirm_password: String,
}

#[derive(Serialize)]
pub struct SignupRequest {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub password: String,
    pub confirm_password: String,
}

#[derive(Serialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Deserialize, Debug)]
pub struct ForgotPasswordData {
    pub hash: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct ForgotPasswordApiResponse {
    pub status: String,
    pub message: String,
    pub data: Option<ForgotPasswordData>,
}

#[derive(Serialize)]
pub struct ResetPasswordRequest {
    pub email: String,
    pub otp: String,
    pub new_password: String,
    pub hash: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: i64,
}
