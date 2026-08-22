use crate::AppError;

/// Perbarui `total_balance` di `profile_cache` dengan nilai yang diambil dari API.
///
/// Karena aplikasi desktop ini bersifat single-user (hanya satu profil aktif),
/// UPDATE dilakukan tanpa WHERE clause — semua row di tabel diperbarui sekaligus.
/// Jika tabel kosong (belum ada profil tersimpan), operasi ini tidak menghasilkan error.
pub async fn update_user_balance(pool: &sqlx::SqlitePool, balance: i64) -> Result<(), AppError> {
    tracing::debug!(
        "Memperbarui total_balance di profile_cache dengan nilai: {}",
        balance
    );

    sqlx::query("UPDATE profile_cache SET total_balance = ?")
        .bind(balance)
        .execute(pool)
        .await
        .map_err(|e| {
            tracing::error!("Gagal memperbarui total_balance di profile_cache: {}", e);
            AppError::Database(e)
        })?;

    tracing::debug!("total_balance berhasil diperbarui menjadi {}.", balance);
    Ok(())
}
