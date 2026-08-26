use crate::utils::error::AppError;
use crate::utils::http::create_http_client;
use crate::utils::logger::log_network_error;
use base64::{engine::general_purpose, Engine as _};
use reqwest::header::AUTHORIZATION;
use sqlx::SqlitePool;
use std::fs;
use std::io::Write;
use tauri::Manager;

pub async fn download_and_save_image(
    app: &tauri::AppHandle,
    url: &str,
    token: &str,
    filename: &str,
) -> Result<(), AppError> {
    let images_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| {
            tracing::error!("Gagal mendapatkan app_data_dir: {}", e);
            AppError::Unknown(format!("Gagal mendapatkan app_data_dir: {}", e))
        })?
        .join("images");

    // Ensure the images directory exists
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir).map_err(|e| {
            tracing::error!("Gagal membuat direktori images: {}", e);
            AppError::Unknown(format!("Gagal membuat direktori images: {}", e))
        })?;
    }

    let file_path = images_dir.join(filename);

    let client = create_http_client();
    let res = client
        .get(url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;

    match res {
        Ok(response) => {
            if response.status().is_success() {
                let bytes = response.bytes().await?;

                // Implementasi Atomic Write: Simpan ke file .tmp terlebih dahulu
                let tmp_file_path = images_dir.join(format!("{}.tmp", filename));

                let mut file = fs::File::create(&tmp_file_path).map_err(|e| {
                    tracing::error!(
                        "Gagal membuat file gambar sementara {:?}: {}",
                        tmp_file_path,
                        e
                    );
                    AppError::Unknown(format!("Gagal membuat file gambar: {}", e))
                })?;

                file.write_all(&bytes).map_err(|e| {
                    tracing::error!(
                        "Gagal menulis byte ke file gambar sementara {:?}: {}",
                        tmp_file_path,
                        e
                    );
                    AppError::Unknown(format!("Gagal menulis gambar: {}", e))
                })?;

                // Jika penulisan sukses sempurna 100%, baru kita rename ke nama aslinya
                fs::rename(&tmp_file_path, &file_path).map_err(|e| {
                    tracing::error!(
                        "Gagal me-rename file sementara {:?} ke {:?}: {}",
                        tmp_file_path,
                        file_path,
                        e
                    );
                    AppError::Unknown(format!("Gagal menyimpan gambar final: {}", e))
                })?;

                tracing::info!("Berhasil menyimpan gambar pengumuman: {}", filename);
            } else {
                tracing::warn!("Gagal mengunduh gambar {}: HTTP {}", url, response.status());
            }
        }
        Err(e) => {
            log_network_error(&format!("Unduh gambar {}", filename), &e);
            return Err(e.into());
        }
    }

    Ok(())
}

pub async fn read_image_as_base64(app: &tauri::AppHandle, filename: &str) -> Option<String> {
    let file_path = app
        .path()
        .app_data_dir()
        .ok()?
        .join("images")
        .join(filename);

    if !file_path.exists() {
        return None;
    }

    match fs::read(&file_path) {
        Ok(bytes) => {
            let encoded = general_purpose::STANDARD.encode(&bytes);
            // Determine MIME type dynamically based on extension, defaulting to png
            let mime_type = if filename.to_lowercase().ends_with(".jpg")
                || filename.to_lowercase().ends_with(".jpeg")
            {
                "image/jpeg"
            } else if filename.to_lowercase().ends_with(".gif") {
                "image/gif"
            } else if filename.to_lowercase().ends_with(".webp") {
                "image/webp"
            } else {
                "image/png"
            };

            Some(format!("data:{};base64,{}", mime_type, encoded))
        }
        Err(e) => {
            tracing::warn!("Gagal membaca file gambar {:?}: {}", file_path, e);
            None
        }
    }
}

pub async fn cleanup_unused_images(app: &tauri::AppHandle, pool: &SqlitePool) {
    let images_dir = match app.path().app_data_dir() {
        Ok(dir) => dir.join("images"),
        Err(_) => return,
    };

    if !images_dir.exists() {
        return;
    }

    let mut used_filenames = std::collections::HashSet::new();

    #[derive(sqlx::FromRow)]
    struct AnnRow {
        announcements_img: Option<String>,
    }

    if let Ok(rows) =
        sqlx::query_as::<_, AnnRow>("SELECT announcements_img FROM announcements_cache")
            .fetch_all(pool)
            .await
    {
        for row in rows {
            if let Some(url) = row.announcements_img {
                if let Some(filename) = url.split('/').last() {
                    used_filenames.insert(filename.to_string());
                }
            }
        }
    }

    #[derive(sqlx::FromRow)]
    struct EduRow {
        education_img: Option<String>,
    }

    if let Ok(rows) = sqlx::query_as::<_, EduRow>("SELECT education_img FROM education_cache")
        .fetch_all(pool)
        .await
    {
        for row in rows {
            if let Some(url) = row.education_img {
                if let Some(filename) = url.split('/').last() {
                    used_filenames.insert(filename.to_string());
                }
            }
        }
    }

    #[derive(sqlx::FromRow)]
    struct ProfileRow {
        avatar_url: Option<String>,
    }

    if let Ok(rows) = sqlx::query_as::<_, ProfileRow>("SELECT avatar_url FROM profile_cache")
        .fetch_all(pool)
        .await
    {
        for row in rows {
            if let Some(url) = row.avatar_url {
                if let Some(filename) = url.split('/').last() {
                    used_filenames.insert(filename.to_string());
                }
            }
        }
    }

    if let Ok(entries) = std::fs::read_dir(&images_dir) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    if let Some(filename) = entry.file_name().to_str() {
                        if !used_filenames.contains(filename) {
                            if let Err(e) = std::fs::remove_file(entry.path()) {
                                tracing::warn!(
                                    "Gagal menghapus file gambar usang {:?}: {}",
                                    entry.path(),
                                    e
                                );
                            } else {
                                tracing::info!(
                                    "Berhasil menghapus file gambar usang: {}",
                                    filename
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}
