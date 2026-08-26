use crate::models::announcement_model::{
    AnnouncementClientResponse, AnnouncementContent, AnnouncementItem,
};
use crate::AppError;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};

pub async fn upsert_announcements(
    pool: &SqlitePool,
    items: &[AnnouncementItem],
) -> Result<(), AppError> {
    for item in items {
        let content_json =
            serde_json::to_string(&item.data.content).map_err(AppError::JsonParse)?;

        sqlx::query(
            r#"
            INSERT INTO announcements_cache (id_announcements, title, content, announcements_img, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id_announcements) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                announcements_img = excluded.announcements_img,
                created_at = excluded.created_at
            "#
        )
        .bind(&item.id_announcements)
        .bind(&item.data.title)
        .bind(&content_json)
        .bind(&item.data.announcements_img)
        .bind(&item.data.created_at)
        .execute(pool)
        .await?;
    }

    // Hapus data lokal yang sudah tidak ada di server
    if !items.is_empty() {
        let mut query_builder: QueryBuilder<Sqlite> =
            QueryBuilder::new("DELETE FROM announcements_cache WHERE id_announcements NOT IN (");
        let mut separated = query_builder.separated(", ");
        for item in items {
            separated.push_bind(&item.id_announcements);
        }
        separated.push_unseparated(")");
        query_builder.build().execute(pool).await?;
    } else {
        sqlx::query("DELETE FROM announcements_cache")
            .execute(pool)
            .await?;
    }

    Ok(())
}

#[derive(sqlx::FromRow)]
struct AnnouncementRow {
    id_announcements: Option<String>,
    title: String,
    content: Option<String>,
    announcements_img: Option<String>,
    created_at: String,
}

pub async fn get_cached_announcements(
    pool: &SqlitePool,
    app: &tauri::AppHandle,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AnnouncementClientResponse>, AppError> {
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT id_announcements, title, content, announcements_img, created_at FROM announcements_cache WHERE 1=1"
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

    let rows: Vec<AnnouncementRow> = query_builder.build_query_as().fetch_all(pool).await?;

    let mut announcements = Vec::new();
    for row in rows {
        let content_json = row.content.unwrap_or_else(|| "{}".to_string());

        let content: AnnouncementContent =
            serde_json::from_str(&content_json).unwrap_or_else(|_| AnnouncementContent {
                text: String::new(),
                author: String::new(),
                important: false,
            });

        let mut image_base64 = None;
        if let Some(ref img_url) = row.announcements_img {
            if let Some(filename) = img_url.split('/').last() {
                image_base64 = crate::utils::file_utils::read_image_as_base64(app, filename).await;
            }
        }

        announcements.push(AnnouncementClientResponse {
            id: row.id_announcements.unwrap_or_default(),
            title: row.title,
            content,
            image_url: row.announcements_img,
            image_base64,
            created_at: row.created_at,
        });
    }

    Ok(announcements)
}
