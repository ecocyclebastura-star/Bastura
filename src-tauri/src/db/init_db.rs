use crate::AppError;
use sqlx::{sqlite::{SqliteConnectOptions, SqlitePoolOptions}, SqlitePool}; // Pastikan ini sesuai dengan struktur modul error-mu
use std::path::Path;

pub async fn init_db(db_path: &Path) -> Result<SqlitePool, AppError> {
    tracing::info!("Menginisialisasi database SQLite...");

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true);

    let pool = match SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
    {
        Ok(pool) => pool,
        Err(e) => {
            tracing::error!("Gagal menghubungkan ke database SQLite: {}", e);
            return Err(e.into());
        }
    };

    if let Err(e) = sqlx::query(
        "
        /* =========================================
           KELOMPOK 1: MANAJEMEN WAKTU SINKRONISASI
           ========================================= */

        CREATE TABLE IF NOT EXISTS local_sync_logs (
            sync_category TEXT PRIMARY KEY,      
            last_synced_at DATETIME NOT NULL     
        );

        /* =========================================
           KELOMPOK 2: DATA PRIBADI & KONTEN UMUM 
           ========================================= */

        -- 1. Profil Pengguna
        CREATE TABLE IF NOT EXISTS profile_cache (
            id_users TEXT PRIMARY KEY,           
            email TEXT NOT NULL,
            name TEXT,
            phone TEXT,
            avatar_url TEXT,
            total_balance INTEGER DEFAULT 0
        );

        -- 2. Tabungan Pribadi
        CREATE TABLE IF NOT EXISTS transaction_history_cache (
            id TEXT PRIMARY KEY,         
            type TEXT NOT NULL,            
            title TEXT NOT NULL,
            subtitle TEXT,
            amount INTEGER NOT NULL,      
            status TEXT NOT NULL,             
            date TEXT NOT NULL
        );

        -- 3. Katalog Sampah
        CREATE TABLE IF NOT EXISTS waste_catalog_cache (
            id TEXT PRIMARY KEY,
            jenis TEXT NOT NULL,             
            category TEXT NOT NULL,          
            description TEXT,                
            unit TEXT NOT NULL,              
            price_per_unit INTEGER NOT NULL, 
            avatar_url TEXT                  
        );

        -- 4. Pengumuman
        CREATE TABLE IF NOT EXISTS announcements_cache (
            id_announcements TEXT PRIMARY KEY,   
            title TEXT NOT NULL,
            content TEXT,                        
            announcements_img TEXT,
            created_at DATETIME NOT NULL
        );

        -- 5. Edukasi Lingkungan
        CREATE TABLE IF NOT EXISTS education_cache (
            id_content TEXT PRIMARY KEY,         
            title TEXT NOT NULL,
            content TEXT,                        
            education_img TEXT,
            created_at DATETIME NOT NULL
        );

        /* =========================================
           KELOMPOK 3: DATA KHUSUS ADMIN 
           ========================================= */

        -- 6. Daftar Seluruh Warga
        CREATE TABLE IF NOT EXISTS daftar_warga_cache (
            id TEXT PRIMARY KEY,           
            name TEXT NOT NULL,
            email TEXT NOT NULL,                 
            phone TEXT NOT NULL,
            avatar_url TEXT,
            balance INTEGER DEFAULT 0
        );

        -- 7. Daftar Setoran Global
        CREATE TABLE IF NOT EXISTS transaksi_global_cache (
            id TEXT PRIMARY KEY, 
            id_user TEXT NOT NULL,               
            nama_warga TEXT NOT NULL,            
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            amount INTEGER NOT NULL,      
            status TEXT NOT NULL,             
            date TEXT NOT NULL
        );

        /* =========================================
           KELOMPOK 4: Draft Pengumuman/Edukasi
           ========================================= */

        -- 8. Draft Pengumuman/Edukasi
        CREATE TABLE IF NOT EXISTS draft_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            post_type TEXT NOT NULL,             
            title TEXT,
            content TEXT,                        
            local_img_path TEXT,                 
            last_saved DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- 9. Draft Hitung Bagi Hasil (Split Bill)
        CREATE TABLE IF NOT EXISTS draft_split_bill (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pendapatan_kotor TEXT NOT NULL,
            pendapatan_bersih TEXT NOT NULL,
            date_start TEXT NOT NULL,
            date_end TEXT NOT NULL,
            allocations_payload TEXT NOT NULL,
            last_saved DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )
    .execute(&pool)
    .await
    {
        tracing::error!("Gagal membuat struktur tabel SQLite: {}", e);
        return Err(e.into());
    }

    tracing::info!("Inisialisasi database SQLite dan skema tabel berhasil diselesaikan.");
    Ok(pool)
}
