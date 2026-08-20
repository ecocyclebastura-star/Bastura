use std::path::PathBuf;
use std::fs;
use std::time::{SystemTime, Duration};
use tracing_subscriber::{fmt, EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

pub fn setup_logger(app_data_dir: &PathBuf) {
    let logs_dir = app_data_dir.join("logs");
    
    // Create logs directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&logs_dir) {
        eprintln!("Failed to create logs directory: {}", e);
        return;
    }

    // Cleanup old logs (older than 7 days)
    cleanup_old_logs(&logs_dir);

    // File appender using rolling::daily
    let file_appender = tracing_appender::rolling::daily(&logs_dir, "bastura.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    // Console layer
    let console_layer = fmt::layer()
        .with_target(true)
        .with_ansi(true);

    // File layer
    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .with_target(true)
        .with_ansi(false);

    // Env filter
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // Initialize tracing (stdout + file)
    tracing_subscriber::registry()
        .with(env_filter)
        .with(console_layer)
        .with(file_layer)
        .init();
        
    // Prevent the guard from being dropped so the background logging thread stays alive
    Box::leak(Box::new(_guard));
}

fn cleanup_old_logs(logs_dir: &PathBuf) {
    let seven_days = Duration::from_secs(7 * 24 * 60 * 60);
    let now = SystemTime::now();

    if let Ok(entries) = fs::read_dir(logs_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(duration) = now.duration_since(modified) {
                        if duration > seven_days {
                            if let Err(e) = fs::remove_file(entry.path()) {
                                eprintln!("Failed to clean up old log file {:?}: {}", entry.path(), e);
                            } else {
                                println!("Cleaned up old log file: {:?}", entry.path());
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn log_network_error(context: &str, err: &reqwest::Error) {
    let reason = if err.is_timeout() {
        "Waktu koneksi habis (Timeout)".to_string()
    } else if err.is_connect() {
        "Gagal terhubung ke server (Masalah Jaringan/Koneksi)".to_string()
    } else {
        "Terjadi kesalahan pada jaringan".to_string()
    };

    tracing::error!("{} gagal: {}", context, reason);
}
