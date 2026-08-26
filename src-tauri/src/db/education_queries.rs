use crate::models::education_model::{EducationClientResponse, EducationContent, EducationItem};
use crate::AppError;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};

pub async fn upsert_education(pool: &SqlitePool, items: &[EducationItem]) -> Result<(), AppError> {
    for item in items {
        let content_json =
            serde_json::to_string(&item.data.content).map_err(AppError::JsonParse)?;

        sqlx::query(
            r#"
            INSERT INTO education_cache (id_content, title, content, education_img, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id_content) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                education_img = excluded.education_img,
                created_at = excluded.created_at
            "#,
        )
        .bind(&item.id_content)
        .bind(&item.data.title)
        .bind(&content_json)
        .bind(&item.data.education_img)
        .bind(&item.data.created_at)
        .execute(pool)
        .await?;
    }

    // Hapus data lokal yang sudah tidak ada di server
    if !items.is_empty() {
        let mut query_builder: QueryBuilder<Sqlite> =
            QueryBuilder::new("DELETE FROM education_cache WHERE id_content NOT IN (");
        let mut separated = query_builder.separated(", ");
        for item in items {
            separated.push_bind(&item.id_content);
        }
        separated.push_unseparated(")");
        query_builder.build().execute(pool).await?;
    } else {
        sqlx::query("DELETE FROM education_cache")
            .execute(pool)
            .await?;
    }

    Ok(())
}

#[derive(sqlx::FromRow)]
struct EducationRow {
    id_content: Option<String>,
    title: String,
    content: Option<String>,
    education_img: Option<String>,
    created_at: String,
}

pub async fn get_cached_education(
    pool: &SqlitePool,
    app: &tauri::AppHandle,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<EducationClientResponse>, AppError> {
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT id_content, title, content, education_img, created_at FROM education_cache WHERE 1=1"
    );

    if let Some(s) = search {
        if !s.trim().is_empty() {
            let like_term = format!("%{}%", s);
            query_builder.push(" AND (title LIKE ");
            query_builder.push_bind(like_term.clone());
            query_builder.push(" OR content LIKE ");
            query_builder.push_bind(like_term);
            query_builder.push(")");
        }
    }

    query_builder.push(" ORDER BY created_at DESC");

    let final_limit = limit.unwrap_or(50);
    query_builder.push(" LIMIT ");
    query_builder.push_bind(final_limit);

    let rows: Vec<EducationRow> = query_builder.build_query_as().fetch_all(pool).await?;

    let mut education_list = Vec::new();
    for row in rows {
        let content_json = row.content.unwrap_or_else(|| "{}".to_string());

        let content: EducationContent =
            serde_json::from_str(&content_json).unwrap_or_else(|_| EducationContent {
                tags: Vec::new(),
                text: String::new(),
            });

        let mut image_base64 = None;
        if let Some(ref img_url) = row.education_img {
            if let Some(filename) = img_url.split('/').last() {
                image_base64 = crate::utils::file_utils::read_image_as_base64(app, filename).await;
            }
        }

        education_list.push(EducationClientResponse {
            id: row.id_content.unwrap_or_default(),
            title: row.title,
            content,
            image_url: row.education_img,
            image_base64,
            created_at: row.created_at,
        });
    }

    Ok(education_list)
}
