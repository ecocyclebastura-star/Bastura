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
    COALESCE(d.amount_sb, 0)::BIGINT AS nominal, 
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
    COALESCE(SUM(d.weight_dp), 0) AS total_weight,
    r.roles AS role
FROM users u
LEFT JOIN balance b ON u.id_users = b.id_user
LEFT JOIN deposit d ON u.id_users = d.id_user AND d.dp_status = 'processed'
LEFT JOIN roles r ON u.role_id = r.id_roles
WHERE u.role_id = 1
GROUP BY 
    u.id_users, 
    u.name, 
    u.email, 
    u.phone, 
    u.created_at,
    u.status_active,
    u.balance_held,
    b.total_balance,
    r.roles;

CREATE OR REPLACE VIEW view_data_users AS
SELECT 
    u.id_users,
    u.name,
    u.email,
    u.phone,
    u.created_at,             
    u.status_active, 
    u.balance_held,    
    COALESCE(b.total_balance, 0) AS total_balance,
    COALESCE(SUM(d.weight_dp), 0) AS total_weight,
    r.roles AS role,
    u.role_id
FROM users u
LEFT JOIN balance b ON u.id_users = b.id_user
LEFT JOIN deposit d ON u.id_users = d.id_user AND d.dp_status = 'processed'
LEFT JOIN roles r ON u.role_id = r.id_roles
GROUP BY 
    u.id_users, 
    u.name, 
    u.email, 
    u.phone, 
    u.created_at,
    u.status_active,
    u.balance_held,
    b.total_balance,
    r.roles,
    u.role_id;

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

-- View untuk detail splitbills beserta alokasi warga dan info fee
CREATE OR REPLACE VIEW view_splitbills_detail AS
SELECT
    sb.id_sb,
    sb.total_sb,
    sb.date_start,
    sb.date_end,
    sb.remaining_sb,
    sb.status,
    sb.processed_at,
    sb.processed_by,
    sb.fee_percent                                     AS fee_persen,
    (sb.total_sb - p.amount_profit)                    AS dana_setelah_pajak,
    sba.id_sb_allocations,
    sba.id_user,
    u.name                                             AS nama_warga,
    u.email,
    sba.final_amount,
    sba.allocated_at
FROM split_bills sb
LEFT JOIN profit p ON sb.id_sb = p.id_sb
LEFT JOIN sb_allocations sba ON sb.id_sb = sba.id_sb
LEFT JOIN users u ON sba.id_user = u.id_users;