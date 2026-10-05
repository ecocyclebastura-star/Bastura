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
            serde_json::from_str(&content_json).unwrap_or_else(|_| {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&content_json) {
                    let text = value.get("isi_konten")
                        .and_then(|i| i.get("inti"))
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .to_string();
                        
                    let author = value.get("kontak_informasi")
                        .and_then(|k| k.get("nama_divisi"))
                        .and_then(|a| a.as_str())
                        .unwrap_or("")
                        .to_string();
                        
                    let important = value.get("pengaturan_tampilan")
                        .and_then(|p| p.get("tampilkan_penulis"))
                        .and_then(|i| i.as_bool())
                        .unwrap_or(false);

                    AnnouncementContent {
                        text,
                        author,
                        important,
                    }
                } else {
                    AnnouncementContent {
                        text: String::new(),
                        author: String::new(),
                        important: false,
                    }
                }
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

pub async fn upsert_announcement_draft(
    pool: &SqlitePool,
    draft: &crate::models::announcement_model::AnnouncementDraft,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO announcement_drafts_cache (draft_id, title, content, category_id, image_local_path, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(draft_id) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            category_id = excluded.category_id,
            image_local_path = excluded.image_local_path,
            updated_at = excluded.updated_at
        "#
    )
    .bind(&draft.draft_id)
    .bind(&draft.title)
    .bind(&draft.content)
    .bind(&draft.category_id)
    .bind(&draft.image_local_path)
    .bind(&draft.updated_at)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_draft_announcements(
    pool: &SqlitePool,
) -> Result<Vec<crate::models::announcement_model::AnnouncementDraft>, AppError> {
    let rows = sqlx::query_as::<_, crate::models::announcement_model::AnnouncementDraft>(
        "SELECT draft_id, title, content, category_id, image_local_path, updated_at FROM announcement_drafts_cache ORDER BY updated_at DESC"
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn delete_announcement_draft(
    pool: &SqlitePool,
    draft_id: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM announcement_drafts_cache WHERE draft_id = ?")
        .bind(draft_id)
        .execute(pool)
        .await?;

    Ok(())
}


pub async fn get_announcement_draft_by_id(
    pool: &SqlitePool,
    draft_id: &str,
) -> Result<crate::models::announcement_model::AnnouncementDraft, AppError> {
    let row = sqlx::query_as::<_, crate::models::announcement_model::AnnouncementDraft>(
        "SELECT draft_id, title, content, category_id, image_local_path, updated_at FROM announcement_drafts_cache WHERE draft_id = ?"
    )
    .bind(draft_id)
    .fetch_one(pool)
    .await?;

    Ok(row)
}
