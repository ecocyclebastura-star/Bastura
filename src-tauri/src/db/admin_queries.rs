use crate::AppError;
use sqlx::SqlitePool;
use crate::models::admin_model::WargaLocalItem;

pub async fn upsert_warga_batch(pool: &SqlitePool, warga_list: &[WargaLocalItem]) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;

    for warga in warga_list {
        sqlx::query(
            r#"
            INSERT INTO daftar_warga_cache (
                id_users, name, email, phone, created_at, status_active,
                balance_held, total_balance, total_weight
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_users) DO UPDATE SET
                name = excluded.name,
                email = excluded.email,
                phone = excluded.phone,
                created_at = excluded.created_at,
                status_active = excluded.status_active,
                balance_held = excluded.balance_held,
                total_balance = excluded.total_balance,
                total_weight = excluded.total_weight
            "#,
        )
        .bind(&warga.id_users)
        .bind(&warga.name)
        .bind(&warga.email)
        .bind(&warga.phone)
        .bind(&warga.created_at)
        .bind(&warga.status_active)
        .bind(warga.balance_held)
        .bind(warga.total_balance)
        .bind(warga.total_weight)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn get_cached_warga(pool: &SqlitePool, search_query: Option<String>) -> Result<Vec<WargaLocalItem>, AppError> {
    let mut query = sqlx::QueryBuilder::new("SELECT * FROM daftar_warga_cache");

    if let Some(search) = search_query {
        let search = search.trim();
        if !search.is_empty() {
            let like_term = format!("%{}%", search);
            query.push(" WHERE name LIKE ");
            query.push_bind(like_term.clone());
            query.push(" OR email LIKE ");
            query.push_bind(like_term);
        }
    }

    let result = query.build_query_as::<WargaLocalItem>()
        .fetch_all(pool)
        .await?;

    Ok(result)
}

pub async fn update_warga_status_local(
    pool: &SqlitePool,
    id_users: &str,
    new_status: &str,
) -> Result<(), AppError> {
    sqlx::query("UPDATE daftar_warga_cache SET status_active = ? WHERE id_users = ?")
        .bind(new_status)
        .bind(id_users)
        .execute(pool)
        .await?;

    Ok(())
}
