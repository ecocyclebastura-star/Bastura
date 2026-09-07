CREATE OR REPLACE VIEW view_riwayat_transaksi AS

SELECT 
    id_wd AS id_transaksi,
    id_user,
    'Penarikan Saldo' AS jenis_transaksi,
    'Saldo Dompet' AS deskripsi,
    -amount AS nominal, 
    wd_status AS status,
    created_at AS tanggal_transaksi
FROM withdrawals

UNION ALL


SELECT 
    d.id_deposit AS id_transaksi,
    d.id_user,
    'Setoran Sampah' AS jenis_transaksi,
    c.name || '/' || d.weight_dp || c.unit AS deskripsi, 
    d.amount_sb AS nominal, 
    d.dp_status AS status,
    d.created_at AS tanggal_transaksi
FROM deposit d
JOIN waste_catalog c ON d.catalog_id = c.id_waste;