use crate::models::waste_model::{CatalogItemLocal, WasteCatalogData};
use crate::AppError;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};

pub async fn upsert_catalog_item(
    pool: &SqlitePool,
    item: &WasteCatalogData,
    image_base64: Option<String>,
) -> Result<(), AppError> {
    let price: i64 = item.price.parse().unwrap_or(0);

    sqlx::query(
        r#"
        INSERT INTO waste_catalog_cache (
            id_waste, name, category_id, category_name, unit, price, description, catalog_img, image_base64
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id_waste) DO UPDATE SET
            name = excluded.name,
            category_id = excluded.category_id,
            category_name = excluded.category_name,
            unit = excluded.unit,
            price = excluded.price,
            description = excluded.description,
            catalog_img = excluded.catalog_img,
            image_base64 = excluded.image_base64
        "#
    )
    .bind(&item.id_waste)
    .bind(&item.name)
    .bind(item.category_id)
    .bind(&item.category_name)
    .bind(&item.unit)
    .bind(price)
    .bind(&item.description)
    .bind(&item.catalog_img)
    .bind(&image_base64)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_catalog_item(
    pool: &SqlitePool,
    id_waste: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM waste_catalog_cache WHERE id_waste = ?")
        .bind(id_waste)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_cached_catalog(
    pool: &SqlitePool,
    search_query: Option<String>,
    category_id: Option<i64>,
) -> Result<Vec<CatalogItemLocal>, AppError> {
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT id_waste, name, category_id, category_name, unit, price, description, catalog_img, image_base64 FROM waste_catalog_cache WHERE 1=1"
    );

    if let Some(s) = search_query {
        if !s.trim().is_empty() {
            let like_term = format!("%{}%", s);
            query_builder.push(" AND name LIKE ");
            query_builder.push_bind(like_term);
        }
    }

    if let Some(cat_id) = category_id {
        query_builder.push(" AND category_id = ");
        query_builder.push_bind(cat_id);
    }

    query_builder.push(" ORDER BY name ASC");

    let rows: Vec<CatalogItemLocal> = query_builder.build_query_as().fetch_all(pool).await?;

    Ok(rows)
}

pub async fn get_unit_by_waste_id(
    pool: &SqlitePool,
    id_waste: &str,
) -> Result<Option<String>, AppError> {
    // We just need the `unit` field or description to extract [UNIT:PC]
    let row: Option<(Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT unit, description FROM waste_catalog_cache WHERE id_waste = ?"
    )
    .bind(id_waste)
    .fetch_optional(pool)
    .await?;

    if let Some((unit, desc)) = row {
        // Fallback checks just in case
        if let Some(d) = desc {
            if d.contains("[UNIT:PC]") {
                return Ok(Some("pc".to_string()));
            }
        }
        return Ok(unit);
    }
    
    Ok(None)
}
