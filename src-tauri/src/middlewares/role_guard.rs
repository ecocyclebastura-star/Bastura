use crate::services::auth_service::decode_jwt_role;
use crate::utils::error::AppError;
use crate::utils::state::AppState;

pub async fn require_admin(state: &AppState) -> Result<String, AppError> {
    let token = state.get_valid_token().await?;
    let role = decode_jwt_role(&token);

    if role != "admin" && role != "super admin" {
        tracing::warn!("Akses ditolak. Role '{}' mencoba mengakses fitur khusus admin.", role);
        return Err(AppError::Forbidden(
            "Akses ditolak. Fitur ini hanya untuk Admin.".to_string(),
        ));
    }
    Ok(token)
}
