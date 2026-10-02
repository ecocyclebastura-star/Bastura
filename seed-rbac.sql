INSERT INTO users (id_users, email, password, name, role_id, status_active, created_at) VALUES 
('40000000-0000-0000-0000-000000000001', 'test_rbac_user@example.com', crypt('password123', gen_salt('bf')), 'RBAC User', 1, 'active', NOW()),
('40000000-0000-0000-0000-000000000002', 'test_rbac_admin@example.com', crypt('password123', gen_salt('bf')), 'RBAC Admin', 2, 'active', NOW()),
('40000000-0000-0000-0000-000000000003', 'test_rbac_superadmin@example.com', crypt('password123', gen_salt('bf')), 'RBAC Super Admin', 3, 'active', NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO balance (id_user, total_balance, created_at) VALUES
('40000000-0000-0000-0000-000000000001', 0, NOW()),
('40000000-0000-0000-0000-000000000002', 0, NOW()),
('40000000-0000-0000-0000-000000000003', 0, NOW())
ON CONFLICT (id_user) DO NOTHING;
