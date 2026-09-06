use crate::models::transaction_model::TransactionItem;
use crate::AppError;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};

pub async fn upsert_transactions(
    pool: &SqlitePool,
    transactions: &[TransactionItem],
) -> Result<(), AppError> {
    for item in transactions {
        sqlx::query(
            r#"
            INSERT INTO transaction_history_cache (
                id_transaksi, jenis_transaksi, deskripsi, nominal, status, tanggal_transaksi
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_transaksi) DO UPDATE SET
                jenis_transaksi = excluded.jenis_transaksi,
                deskripsi = excluded.deskripsi,
                nominal = excluded.nominal,
                status = excluded.status,
                tanggal_transaksi = excluded.tanggal_transaksi
            "#,
        )
        .bind(&item.id_transaksi)
        .bind(&item.jenis_transaksi)
        .bind(&item.deskripsi)
        .bind(&item.nominal)
        .bind(&item.status)
        .bind(&item.tanggal_transaksi)
        .execute(pool)
        .await?;
    }

    // Hapus data lokal yang sudah tidak ada di server
    if !transactions.is_empty() {
        let mut query_builder: QueryBuilder<Sqlite> =
            QueryBuilder::new("DELETE FROM transaction_history_cache WHERE id_transaksi NOT IN (");
        let mut separated = query_builder.separated(", ");
        for item in transactions {
            separated.push_bind(&item.id_transaksi);
        }
        separated.push_unseparated(")");
        query_builder.build().execute(pool).await?;
    } else {
        sqlx::query("DELETE FROM transaction_history_cache")
            .execute(pool)
            .await?;
    }

    Ok(())
}

pub async fn get_cached_transaction_history(
    pool: &SqlitePool,
    payload: crate::models::transaction_model::TransactionHistoryPayload,
) -> Result<crate::models::transaction_model::TransactionResponseData, AppError> {
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT id_transaksi, jenis_transaksi, deskripsi, nominal, status, tanggal_transaksi FROM transaction_history_cache WHERE 1=1"
    );

    if let Some(jenis) = &payload.jenis_transaksi {
        query_builder.push(" AND LOWER(jenis_transaksi) LIKE ");
        query_builder.push_bind(format!("%{}%", jenis.to_lowercase()));
    }

    if let Some(status) = &payload.status {
        let mapped_status = if status.to_lowercase() == "pending" {
            "processed".to_string()
        } else {
            status.to_lowercase()
        };
        query_builder.push(" AND LOWER(status) LIKE ");
        query_builder.push_bind(format!("%{}%", mapped_status));
    }

    if let Some(cursor) = &payload.cursor {
        // Asumsi cursor adalah tanggal_transaksi. Karena DESC, kita ambil yang < cursor
        query_builder.push(" AND tanggal_transaksi < ");
        query_builder.push_bind(cursor);
    }

    query_builder.push(" ORDER BY datetime(tanggal_transaksi) DESC, id_transaksi DESC");

    let limit = payload.limit.unwrap_or(20);
    // Fetch one extra to determine if there's a next page
    query_builder.push(" LIMIT ");
    query_builder.push_bind(limit + 1);

    let mut rows = query_builder.build_query_as::<TransactionItem>().fetch_all(pool).await?;

    let next_cursor = if rows.len() > limit as usize {
        rows.pop(); // Remove the extra item
        rows.last().map(|last| last.tanggal_transaksi.clone())
    } else {
        None
    };

    Ok(crate::models::transaction_model::TransactionResponseData {
        data: rows,
        next_cursor,
    })
}

/// Update status satu baris di cache lokal setelah cancel withdrawal berhasil dikonfirmasi server.
pub async fn update_transaction_status(
    pool: &SqlitePool,
    id_transaksi: &str,
    new_status: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE transaction_history_cache SET status = ? WHERE id_transaksi = ?",
    )
    .bind(new_status)
    .bind(id_transaksi)
    .execute(pool)
    .await?;

    tracing::debug!(
        "update_transaction_status: id_transaksi={} diupdate menjadi '{}'",
        id_transaksi,
        new_status
    );

    Ok(())
}
