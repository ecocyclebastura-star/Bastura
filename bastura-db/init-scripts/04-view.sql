CREATE OR REPLACE VIEW view_riwayat_transaksi AS

SELECT 
    w.id_wd AS id_transaksi,
    w.id_user,
    u.name,
    'Penarikan Saldo' AS jenis_transaksi,
    'Saldo Dompet' AS deskripsi,
    -w.amount AS nominal, 
    w.wd_status AS status,
    w.created_at AS tanggal_transaksi
FROM withdrawals w
JOIN users u ON w.id_user = u.id_users

UNION ALL


SELECT 
    d.id_deposit AS id_transaksi,
    d.id_user,
    u.name,
    'Setoran Sampah' AS jenis_transaksi,
    c.name || '/' || d.weight_dp || c.unit AS deskripsi, 
    d.amount_sb AS nominal, 
    d.dp_status AS status,
    d.created_at AS tanggal_transaksi
FROM deposit d
JOIN waste_catalog c ON d.catalog_id = c.id_waste
JOIN users u ON d.id_user = u.id_users;

CREATE OR REPLACE VIEW view_data_warga AS
SELECT 
    u.id_users,
    u.name,
    u.email,
    u.phone,
    u.created_at,             
    u.status_active, 
    u.balance_held,    
    COALESCE(b.total_balance, 0) AS total_balance,
    COALESCE(SUM(d.weight_dp), 0) AS total_weight
FROM users u
LEFT JOIN balance b ON u.id_users = b.id_user
LEFT JOIN deposit d ON u.id_users = d.id_user AND d.dp_status = 'processed'
WHERE u.role_id = 1
GROUP BY 
    u.id_users, 
    u.name, 
    u.email, 
    u.phone, 
    u.created_at,
    u.status_active,
    u.balance_held,
    b.total_balance;

CREATE OR REPLACE VIEW view_penarikan_warga  AS
SELECT 
    w.id_wd AS id_transaksi,
    w.id_user,
    u.name,
    'Penarikan Saldo' AS jenis_transaksi,
    'Saldo Dompet' AS deskripsi,
    -w.amount AS nominal, 
    w.wd_status AS status,
    w.created_at AS tanggal_transaksi
FROM withdrawals w
JOIN users u ON w.id_user = u.id_users
GROUP BY 
    w.id_wd,
    w.id_user,
    u.name,
    jenis_transaksi,
    deskripsi,
    nominal,
    w.wd_status,
    w.created_at;  