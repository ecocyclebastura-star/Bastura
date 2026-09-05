use crate::AppError;
use sqlx::SqlitePool;

pub async fn get_last_sync(pool: &SqlitePool, category: &str) -> Result<Option<String>, AppError> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT last_synced_at FROM local_sync_logs WHERE sync_category = ?")
            .bind(category)
            .fetch_optional(pool)
            .await?;

    Ok(row.map(|r| r.0))
}

pub async fn update_last_sync(
    pool: &SqlitePool,
    category: &str,
    timestamp: &str,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO local_sync_logs (sync_category, last_synced_at)
        VALUES (?, ?)
        ON CONFLICT(sync_category) DO UPDATE SET
            last_synced_at = excluded.last_synced_at
        "#,
    )
    .bind(category)
    .bind(timestamp)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn clear_user_cache_and_sync_logs(
    pool: &SqlitePool,
    tables: &[&str],
) -> Result<(), AppError> {
    // 1. Hapus cache tabel
    for table in tables {
        let query = format!("DELETE FROM {}", table);
        if let Err(e) = sqlx::query(&query).execute(pool).await {
            tracing::error!("Gagal menghapus cache tabel {}: {}", table, e);
        }
    }

    // 2. Hapus log sinkronisasi spesifik pengguna
    let categories_to_clear = ["profile", "transaction"];
    for category in categories_to_clear {
        let query = "DELETE FROM local_sync_logs WHERE sync_category = ?";
        if let Err(e) = sqlx::query(query).bind(category).execute(pool).await {
            tracing::error!(
                "Gagal menghapus local_sync_logs untuk kategori {}: {}",
                category,
                e
            );
        }
    }

    Ok(())
}
