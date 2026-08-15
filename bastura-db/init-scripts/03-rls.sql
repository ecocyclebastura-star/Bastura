ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE simba_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

-- policy punya manajemen akun ya (bisa di modif lagi nanti) T_T

CREATE POLICY "user_lihat_profil_sendiri" ON users
FOR SELECT
USING (
    id_users = current_setting('app.current_user_id', true)::uuid
    AND deleted_at IS NULL 
    AND status_active != 'deleted' 
    AND status_active != 'blocked'
);

CREATE POLICY "user_update_profil_sendiri" ON users
FOR UPDATE
USING (id_users = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "admin_lihat_semua_user" ON users
FOR SELECT
USING (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY "super_admin_bisa_update_semua_kecuali_super_admin_lain" ON users
FOR UPDATE
USING (
    current_setting('app.current_user_role', true) = 'super admin'
    AND (
        id_users = current_setting('app.current_user_id', true)::uuid
        OR
        role_id != (SELECT id_roles FROM roles WHERE roles = 'super admin' LIMIT 1)
    )
);

CREATE POLICY "admin_bisa_update_user_saja" ON users
FOR UPDATE
USING (
    current_setting('app.current_user_role', true) = 'admin'
    AND (
        id_users = current_setting('app.current_user_id', true)::uuid
        OR
        role_id = (SELECT id_roles FROM roles WHERE roles = 'users' LIMIT 1)
    )
);

-- policy manajemen catalog

CREATE POLICY "admin_bisa_tambah_catalog" ON waste_catalog
FOR INSERT
WITH CHECK (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_update_catalog" ON waste_catalog
FOR UPDATE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_delete_catalog" ON waste_catalog
FOR DELETE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_tambah_category" ON waste_category
FOR INSERT
WITH CHECK (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_update_category" ON waste_category
FOR UPDATE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting   ('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_delete_category" ON waste_category
FOR DELETE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "user_bisa_lihat_all_catalog" ON waste_catalog
FOR SELECT
USING (current_setting('app.current_user_role', true) = 'user' OR current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_lihat_all_category" ON waste_category
FOR SELECT
USING (current_setting('app.current_user_role', true) = 'user' OR current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

-- policy manajemen pengumuman

CREATE POLICY "admin_bisa_tambah_pengumuman" ON announcements
FOR INSERT
WITH CHECK (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_update_pengumuman" ON announcements
FOR UPDATE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_delete_pengumuman" ON announcements
FOR DELETE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "user_bisa_lihat_pengumuman" ON announcements
FOR SELECT
USING (current_setting('app.current_user_role', true) = 'user' OR current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

-- policy manajemen edukasi

CREATE POLICY "admin_bisa_tambah_edukasi" ON education_content
FOR INSERT
WITH CHECK (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_update_edukasi" ON education_content
FOR UPDATE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_delete_edukasi" ON education_content
FOR DELETE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "user_bisa_lihat_edukasi" ON education_content
FOR SELECT
USING (current_setting('app.current_user_role', true) = 'user' OR current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

-- policy manajemen simba content

CREATE POLICY "admin_bisa_tambah_simba" ON simba_content
FOR INSERT
WITH CHECK (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_update_simba" ON simba_content
FOR UPDATE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_delete_simba" ON simba_content
FOR DELETE
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

CREATE POLICY "admin_bisa_lihat_simba" ON simba_content
FOR SELECT
USING (current_setting('app.current_user_role', true) = 'admin' OR current_setting('app.current_user_role', true) = 'super admin');

-- policy manajemen transaksi

CREATE POLICY "hanya_user_bisa_melihat_riwayat_deposit_dirinya_sendiri" ON deposit
FOR SELECT
USING (id_user = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "admin_bebas_melihat_semua_deposit" ON deposit
FOR SELECT
USING (
    current_setting('app.current_user_role', true) IN ('admin', 'super admin')
);

CREATE POLICY "admin_bisa_insert_deposit" ON deposit
FOR INSERT
USING (
    current_setting('app.current_user_role', true) IN ('admin', 'super admin')
);

CREATE POLICY "admin_bisa_update_deposit" ON deposit
FOR UPDATE
USING (
    current_setting('app.current_user_role', true) IN ('admin', 'super admin')
);

CREATE POLICY "user_bisa_melihat_riwayat_withdrawal_dirinya_sendiri" ON withdrawals
FOR SELECT
USING (id_user = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "admin_bisa_melihat_semua_withdrawal" ON withdrawals
FOR SELECT
USING (
    current_setting('app.current_user_role', true) IN ('admin', 'super admin')
);

CREATE POLICY "user_bisa_insert_withdrawal" ON withdrawals
FOR INSERT
USING (
    current_setting('app.current_user_role', true) = 'user'
);

CREATE POLICY "admin_bisa_update_withdrawal" ON withdrawals
FOR UPDATE
USING (
    current_setting('app.current_user_role', true) IN ('admin', 'super admin')
);

CREATE POLICY "user_bisa_update_status_withdrawal_diri_sendiri" ON withdrawals
FOR UPDATE
USING (
    id_user = current_setting('app.current_user_id', true)::uuid
    AND wd_status = 'processed'
);

CREATE POLICY "admin_bisa_apapun_splitbill" ON split_bills
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('admin', 'super admin'));

CREATE POLICY "admin_bisa_apapun_sb_allocation" ON sb_allocations
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('admin', 'super admin'));

-- policy untuk logging

CREATE POLICY "super_admin_bisa_apaaja_audit_logs" ON audit_logs
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('super admin'));

CREATE POLICY "super_admin_bisa_apaaja_error_logs" ON error_logs
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('super admin'));

CREATE POLICY "super_admin_bisa_apaaja_transaction_logs" ON transaction_logs
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('super admin'));

CREATE POLICY "super_admin_bisa_apaaja_transaction" ON transactions
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('super admin')); 

-- policy profit dan fee

CREATE POLICY "super_admin_bisa_apaaja_profit" ON profit
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('super admin'));

CREATE POLICY "super_admin_bisa_apaaja_fee" ON fee
FOR ALL
USING (current_setting('app.current_user_role', true) IN ('super admin'));
