use crate::models::splitbill_model::*;
use crate::utils::constants::API_BASE_URL;
use crate::utils::error::AppError;
use crate::utils::http::create_http_client;
use crate::utils::state::AppState;
use reqwest::header::AUTHORIZATION;
use crate::models::waste_model::WasteCatalogApiResponse;
use std::collections::HashMap;

#[derive(serde::Deserialize)]
struct GlobalTxApiResponse {
    pub data: GlobalTxDataWrapper,
}

#[derive(serde::Deserialize)]
struct GlobalTxDataWrapper {
    pub data: Vec<SplitBillDetailItem>,
}

pub async fn init_splitbill_service(
    state: &AppState,
    token: &str,
    req: SplitBillInitRequest,
) -> Result<InitSplitBillData, AppError> {
    let client = create_http_client();
    let res = client
        .post(&format!("{}/splitbills/init", API_BASE_URL))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&req)
        .send()
        .await?;

    if res.status().is_success() {
        let api_res: InitSplitBillApiResponse = res.json().await?;
        
        let mut filtered_transactions = Vec::new();
        let start_iso = format!("{}T00:00:00Z", req.date_start);
        let end_iso = format!("{}T23:59:59Z", req.date_end);

        for user_item in &api_res.data.alokasi_preview {
            let user_id = &user_item.id_user;
            
            let user_tx_res = client
                .post(&format!("{}/transaction/transaction-logs/admin/user", API_BASE_URL))
                .header(AUTHORIZATION, format!("Bearer {}", token))
                .json(&serde_json::json!({ "user_id": user_id }))
                .send()
                .await;
                
            if let Ok(response) = user_tx_res {
                if response.status().is_success() {
                    if let Ok(tx_data) = response.json::<GlobalTxApiResponse>().await {
                        for mut item in tx_data.data.data {
                            let stat = item.status.to_lowercase();
                            if item.jenis_transaksi == "Setoran Sampah" 
                                && (stat == "processed" || stat == "pending" || stat == "diproses")
                                && item.tanggal_transaksi >= start_iso 
                                && item.tanggal_transaksi <= end_iso 
                            {
                                item.id_user = Some(user_id.clone());
                                filtered_transactions.push(item);
                            }
                        }
                    }
                }
            }
        }
        
        let catalog_res = client
            .get(&format!("{}/waste/catalog", API_BASE_URL))
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .send()
            .await;

        let mut catalogs = Vec::new();
        if let Ok(catalog_response) = catalog_res {
            if catalog_response.status().is_success() {
                if let Ok(catalog_data) = catalog_response.json::<WasteCatalogApiResponse>().await {
                    catalogs = catalog_data.data.data;
                }
            }
        }
        
        if let Err(e) = crate::db::splitbill_queries::save_splitbill_cache(&state.db, &filtered_transactions, &catalogs).await {
            tracing::error!("Gagal menyimpan cache splitbill ke SQLite: {}", e);
        } else {
            tracing::info!("Berhasil menyimpan {} transaksi dan {} katalog ke cache SQLite", filtered_transactions.len(), catalogs.len());
        }
        
        Ok(api_res.data)
    } else {
        let status = res.status().as_u16();
        let error_text = res.text().await.unwrap_or_default();
        Err(AppError::ApiError {
            http_status: status,
            status: "error".to_string(),
            code: None,
            message: format!("Init Split Bill gagal: {}", error_text),
        })
    }
}

pub async fn confirm_splitbill_service(
    state: &AppState,
    token: &str,
    req: SplitBillConfirmRequest,
) -> Result<String, AppError> {
    if req.alokasi.is_empty() {
        return Err(AppError::ValidationError("Alokasi tidak boleh kosong".to_string()));
    }
    
    if req.alokasi.iter().any(|item| item.final_amount == 0) {
        return Err(AppError::ValidationError("Terdapat user dengan final amount 0, alokasi ditolak.".to_string()));
    }

    let client = create_http_client();
    let res = client
        .post(&format!("{}/splitbills/confirm", API_BASE_URL))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&req)
        .send()
        .await?;

    if res.status().is_success() {
        if let Err(e) = crate::db::splitbill_queries::clear_splitbill_cache(&state.db).await {
            tracing::warn!("Gagal menghapus cache splitbill di SQLite: {}", e);
        }
        Ok("Berhasil konfirmasi split bill".to_string())
    } else {
        let status = res.status().as_u16();
        let error_text = res.text().await.unwrap_or_default();
        Err(AppError::ApiError {
            http_status: status,
            status: "error".to_string(),
            code: None,
            message: format!("Confirm Split Bill gagal: {}", error_text),
        })
    }
}

pub async fn history_splitbill_service(
    _state: &AppState,
    token: &str,
) -> Result<Vec<SplitBillHistoryItem>, AppError> {
    let client = create_http_client();
    let res = client
        .get(&format!("{}/splitbills/history", API_BASE_URL))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if res.status().is_success() {
        let api_res: SplitBillHistoryApiResponse = res.json().await?;
        Ok(api_res.data)
    } else {
        let status = res.status().as_u16();
        let error_text = res.text().await.unwrap_or_default();
        Err(AppError::ApiError {
            http_status: status,
            status: "error".to_string(),
            code: None,
            message: format!("Gagal memuat history split bill: {}", error_text),
        })
    }
}


pub async fn get_user_splitbill_detail_service(
    state: &AppState,
    _token: &str, // Token tidak lagi dipakai karena semua ambil dari SQLite lokal
    target_user_id: String,
    alokasi_baru: i64,
) -> Result<Vec<SplitBillDetailItem>, AppError> {
    // 1. Ambil Data Katalog dari SQLite
    let catalog_map = crate::db::splitbill_queries::get_cached_catalog_map(&state.db)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Gagal membaca cache katalog: {}, fallback default 1.0", e);
            HashMap::new()
        });

    // 2. Ambil transaksi dari SQLite Cache (sudah difilter per user, tanggal, & jenis)
    let filtered_items = crate::db::splitbill_queries::get_cached_transactions_for_user(&state.db, &target_user_id)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Gagal membaca cache transaksi user: {}", e);
            Vec::new()
        });

    if filtered_items.is_empty() {
        tracing::warn!("Tidak ada transaksi setoran sampah untuk user {} di SQLite", target_user_id);
    }

    // 3. Hitung Nilai Dasar per Item
    let mut item_nilai_dasar = Vec::new();
    let mut final_items = Vec::new();
    let mut total_nilai_dasar: f64 = 0.0;

    for mut item in filtered_items {
        let mut weight: f64 = 1.0;
        let mut price: f64 = 1.0;
        
        if let Some(desc) = &item.deskripsi {
            let mut parts: Vec<&str> = desc.split('/').collect();
            if parts.len() >= 2 {
                // Bagian paling akhir adalah berat/unit, misal "4.00kg"
                let w_str = parts.pop().unwrap().replace("kg", "").replace("pc", "").trim().to_string();
                weight = w_str.parse::<f64>().unwrap_or(1.0);
                
                // Sisanya (setelah digabung kembali) adalah nama sampah
                let nama_sampah_asli = parts.join("/").trim().to_string();
                let nama_sampah_lower = nama_sampah_asli.to_lowercase();
                
                // Cari harga di katalog
                let (cat_price, is_pc) = *catalog_map.get(&nama_sampah_lower).unwrap_or(&(1.0, false));
                price = cat_price;

                // Rewrite deskripsi di frontend jika ternyata itu item PC
                if is_pc {
                    item.deskripsi = Some(format!("{}/{}pc", nama_sampah_asli, w_str));
                }
            }
        }
        
        let nilai_dasar = weight * price;
        item_nilai_dasar.push(nilai_dasar);
        total_nilai_dasar += nilai_dasar;
        final_items.push(item);
    }

    // 4. Kalkulasi Rasio Akhir
    let mut result = Vec::new();
    for (i, item) in final_items.into_iter().enumerate() {
        let nilai_dasar = item_nilai_dasar[i];
        let nominal_val = if total_nilai_dasar > 0.0 {
            (nilai_dasar / total_nilai_dasar * (alokasi_baru as f64)).round() as i64
        } else {
            0
        };

        result.push(SplitBillDetailItem {
            id_transaksi: item.id_transaksi.clone(),
            id_user: item.id_user.clone(),
            id_users: item.id_users.clone(),
            jenis_transaksi: item.jenis_transaksi.clone(),
            deskripsi: item.deskripsi.clone(),
            nominal: nominal_val,
            status: item.status.clone(),
            tanggal_transaksi: item.tanggal_transaksi.clone(),
            name: item.name.clone(),
        });
    }

    Ok(result)
}
