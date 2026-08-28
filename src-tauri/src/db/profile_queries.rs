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

#[derive(sqlx::FromRow, Debug)]
pub struct CachedProfileRow {
    pub id_users: String,
    pub name: Option<String>,
    pub email: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
}

/// Menyimpan atau memperbarui data profil ke dalam tabel `profile_cache`.
pub async fn upsert_profile(
    pool: &sqlx::SqlitePool,
    id_users: &str,
    name: &str,
    email: &str,
    phone: &str,
    avatar_url: Option<&str>,
) -> Result<(), AppError> {
    tracing::debug!("Menyimpan/memperbarui profil untuk id_users: {}", id_users);

    sqlx::query(
        r#"
        INSERT INTO profile_cache (id_users, name, email, phone, avatar_url)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id_users) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            phone = excluded.phone,
            avatar_url = excluded.avatar_url;
        "#,
    )
    .bind(id_users)
    .bind(name)
    .bind(email)
    .bind(phone)
    .bind(avatar_url)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Gagal menyimpan/memperbarui profil di profile_cache: {}", e);
        AppError::Database(e)
    })?;

    Ok(())
}

/// Mengambil data profil yang dicache secara lokal.
/// Karena offline-first single user, kita cukup ambil baris pertama.
pub async fn get_cached_profile(
    pool: &sqlx::SqlitePool,
) -> Result<Option<CachedProfileRow>, AppError> {
    let row = sqlx::query_as::<_, CachedProfileRow>(
        "SELECT id_users, name, email, phone, avatar_url FROM profile_cache LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Gagal mengambil profil dari profile_cache: {}", e);
        AppError::Database(e)
    })?;

    Ok(row)
}

/// Mengambil ID user dari profil yang sedang dicache secara lokal.
pub async fn get_cached_user_id(
    pool: &sqlx::SqlitePool,
) -> Result<Option<String>, AppError> {
    let id = sqlx::query_scalar::<_, String>("SELECT id_users FROM profile_cache LIMIT 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("Gagal mengambil id_users dari profile_cache: {}", e);
            AppError::Database(e)
        })?;

    Ok(id)
}
