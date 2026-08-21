/// Tambahkan saldo dummy ke user lokal, atau buat record baru jika belum ada.
/// Menggunakan ON CONFLICT untuk upsert agar aman dipanggil berkali-kali.
pub async fn simulate_add_balance(pool: &sqlx::SqlitePool) -> Result<(), sqlx::Error> {
    tracing::debug!("Menjalankan simulasi penambahan saldo ke SQLite...");

    if let Err(e) = sqlx::query(
        "INSERT INTO profile_cache (id_users, email, total_balance)
         VALUES ('user-local-123', 'local@bastura.app', 1500)
         ON CONFLICT(id_users) DO UPDATE SET
             total_balance = total_balance + 1500",
    )
    .execute(pool)
    .await
    {
        tracing::error!("Gagal mengeksekusi query simulate_add_balance: {}", e);
        return Err(e);
    }

    tracing::debug!("Simulasi penambahan saldo berhasil dieksekusi.");
    Ok(())
}

/// Ambil nilai total_balance terkini dari profile_cache berdasarkan user_id.
pub async fn get_current_balance(
    pool: &sqlx::SqlitePool,
    user_id: &str,
) -> Result<i64, sqlx::Error> {
    tracing::debug!("Mengambil total_balance dari profile_cache...");

    let row: (i64,) = match sqlx::query_as(
        "SELECT total_balance FROM profile_cache WHERE id_users = ?",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Gagal mengambil total_balance dari profile_cache: {}", e);
            return Err(e);
        }
    };

    Ok(row.0)
}
