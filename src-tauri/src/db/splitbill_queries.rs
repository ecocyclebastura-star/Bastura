use crate::models::splitbill_model::SplitBillDetailItem;
use crate::models::waste_model::WasteCatalogData;
use crate::utils::error::AppError;
use sqlx::SqlitePool;
use std::collections::HashMap;

pub async fn save_splitbill_cache(
    pool: &SqlitePool,
    transactions: &[SplitBillDetailItem],
    catalogs: &[WasteCatalogData],
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;

    // Clear old cache
    sqlx::query("DELETE FROM splitbill_transaction_cache").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM splitbill_catalog_cache").execute(&mut *tx).await?;

    for item in transactions {
        sqlx::query(
            r#"
            INSERT INTO splitbill_transaction_cache (
                id_transaksi, id_user, id_users, jenis_transaksi, deskripsi, nominal, status, tanggal_transaksi, name
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&item.id_transaksi)
        .bind(&item.id_user)
        .bind(&item.id_users)
        .bind(&item.jenis_transaksi)
        .bind(&item.deskripsi)
        .bind(item.nominal)
        .bind(&item.status)
        .bind(&item.tanggal_transaksi)
        .bind(&item.name)
        .execute(&mut *tx)
        .await?;
    }

    for catalog in catalogs {
        let price = catalog.price.parse::<f64>().unwrap_or(1.0);
        let is_pc = if let Some(desc) = &catalog.description {
            if desc.contains("[UNIT:PC]") { 1 } else { 0 }
        } else { 0 };
        sqlx::query(
            r#"
            INSERT INTO splitbill_catalog_cache (name, price, is_pc)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(catalog.name.to_lowercase())
        .bind(price)
        .bind(is_pc)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn clear_splitbill_cache(pool: &SqlitePool) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM splitbill_transaction_cache").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM splitbill_catalog_cache").execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn get_cached_catalog_map(pool: &SqlitePool) -> Result<HashMap<String, (f64, bool)>, AppError> {
    #[derive(sqlx::FromRow)]
    struct CatalogRow {
        name: String,
        price: f64,
        is_pc: i32,
    }

    let rows: Vec<CatalogRow> = sqlx::query_as("SELECT name, price, is_pc FROM splitbill_catalog_cache")
        .fetch_all(pool)
        .await?;

    let mut map = HashMap::new();
    for row in rows {
        map.insert(row.name, (row.price, row.is_pc == 1));
    }
    
    Ok(map)
}

pub async fn get_cached_transactions_for_user(
    pool: &SqlitePool,
    target_user_id: &str,
) -> Result<Vec<SplitBillDetailItem>, AppError> {
    let rows = sqlx::query_as::<_, crate::models::transaction_model::TransactionItem>(
        r#"
        SELECT id_transaksi, jenis_transaksi, deskripsi, nominal, status, tanggal_transaksi, name
        FROM splitbill_transaction_cache
        WHERE id_user = ? OR id_users = ?
        "#,
    )
    .bind(target_user_id)
    .bind(target_user_id)
    .fetch_all(pool)
    .await?;

    // Map TransactionItem to SplitBillDetailItem
    let mut result = Vec::new();
    for row in rows {
        result.push(SplitBillDetailItem {
            id_transaksi: row.id_transaksi,
            id_user: Some(target_user_id.to_string()),
            id_users: Some(target_user_id.to_string()),
            jenis_transaksi: row.jenis_transaksi,
            deskripsi: row.deskripsi,
            nominal: row.nominal,
            status: row.status,
            tanggal_transaksi: row.tanggal_transaksi,
            name: row.name,
        });
    }

    Ok(result)
}
