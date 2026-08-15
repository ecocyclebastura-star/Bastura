-- create database bastura;


CREATE TYPE status_users AS ENUM('active', 'deleted', 'blocked');
CREATE TYPE role_s AS ENUM('active','deactive');
CREATE TYPE trans_type AS ENUM('deposit','withdrawal' ,'splitbills');
CREATE TYPE status_tf AS ENUM('processed', 'canceled', 'success' , 'rejected' , 'deleted');

-- buat type enum duluan T_T

CREATE TABLE IF NOT EXISTS roles(
    id_roles SERIAL PRIMARY KEY NOT NULL,
    roles VARCHAR(50) NOT NULL UNIQUE,
    status_role role_s NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS waste_category(
    id_waste_category SERIAL PRIMARY KEY NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    ct_description TEXT
);

CREATE TABLE IF NOT EXISTS announcements(
    id_announcements UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    title VARCHAR(200) NOT NULL,
    content jsonb,
    announcements_img TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS education_content(
    id_content UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    title VARCHAR(200) NOT NULL,
    content jsonb,
    education_img TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS simba_content(
    id_simba UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    field TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS update_logs (
    profile_up TIMESTAMPTZ NOT NULL,
    transaction_up TIMESTAMPTZ NOT NULL,
    announcements_up TIMESTAMPTZ NOT NULL,
    education_up TIMESTAMPTZ NOT NULL,
    simba_up TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS profit (
    id_profit UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    amount_profit BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fee (
    id_fee UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    amount_fee BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- table mandiri yang tidak bergantung satu sama lain beb t_t (DIATAS)

CREATE TABLE IF NOT EXISTS users(
    id_users UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, 
    name VARCHAR(100),
    phone VARCHAR(20), 
    avatar_url TEXT,
    role_id INT NOT NULL DEFAULT 1, 
    status_active status_users DEFAULT 'active',
    total_balance BIGINT DEFAULT 0 NOT NULL,
    balance_held BIGINT,
    blocked_at TIMESTAMPTZ, 
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    reason_banned VARCHAR(200),

    CONSTRAINT fk_role_id FOREIGN KEY (role_id) REFERENCES roles(id_roles)
);

CREATE TABLE IF NOT EXISTS refresh_tokens(
    id_token UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    access_expired TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id_users) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS waste_catalog(
    id_waste UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL, 
    unit VARCHAR(25) NOT NULL,
    price BIGINT NOT NULL,
    description TEXT,
    catalog_img TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_category_id FOREIGN KEY (category_id) REFERENCES waste_category(id_waste_category)
);

CREATE TABLE IF NOT EXISTS audit_logs(
    id_audit SERIAL PRIMARY KEY NOT NULL,
    actor_id UUID NOT NULL,
    target_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_actor_id FOREIGN KEY (actor_id) REFERENCES users(id_users),
    CONSTRAINT fk_target_id FOREIGN KEY (target_id) REFERENCES users(id_users)   
);

CREATE TABLE IF NOT EXISTS error_logs(
    id_error SERIAL PRIMARY KEY NOT NULL,
    error_message TEXT NOT NULL,
    error_level VARCHAR(25) NOT NULL,
    source VARCHAR(200),
    error_at TIMESTAMPTZ NOT NULL DEFAULT now() 
);

CREATE TABLE IF NOT EXISTS transactions(
    id_transaction UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    process_type trans_type NOT NULL 
);

CREATE TABLE IF NOT EXISTS transaction_logs(
    id_transaction SERIAL PRIMARY KEY NOT NULL,
    id_tsc UUID NOT NULL,
    tsc_type VARCHAR(25) NOT NULL,
    processed_by UUID NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    detail_tsc TEXT,

    CONSTRAINT fk_id_tsc FOREIGN KEY (id_tsc) REFERENCES transactions(id_transaction),
    CONSTRAINT fk_processed_by FOREIGN KEY (processed_by) REFERENCES users(id_users)
);

CREATE TABLE IF NOT EXISTS balance(
    id_balance UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    id_user UUID NOT NULL,
    total_balance BIGINT NOT NULL,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 

    CONSTRAINT fk_id_user FOREIGN KEY (id_user) REFERENCES users(id_users),
    CONSTRAINT cek_total_balance CHECK (total_balance >= 0)
);

CREATE TABLE IF NOT EXISTS deposit (
    id_deposit UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    id_user UUID NOT NULL,
    catalog_id UUID NOT NULL,
    weight_dp BIGINT NOT NULL,
    dp_status status_tf DEFAULT 'processed',
    dp_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,  

    CONSTRAINT fk_id_user_deposit FOREIGN KEY (id_user) REFERENCES users(id_users),
    CONSTRAINT fk_catalog_id FOREIGN KEY (catalog_id) REFERENCES waste_catalog(id_waste)
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id_wd UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    id_user UUID NOT NULL,
    amount BIGINT NOT NULL,
    wd_status status_tf DEFAULT 'processed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,  

    CONSTRAINT fk_id_user_wd FOREIGN KEY (id_user) REFERENCES users(id_users),
    CONSTRAINT cek_amount CHECK (amount > 0)    
);

CREATE TABLE IF NOT EXISTS split_bills (
    id_sb UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    total_sb BIGINT NOT NULL,
    date_start TIMESTAMPTZ, 
    date_end TIMESTAMPTZ,
    remaining_sb BIGINT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_by UUID NOT NULL,

    CONSTRAINT fk_processed_by_sb FOREIGN KEY (processed_by) REFERENCES users(id_users)
);

CREATE TABLE IF NOT EXISTS sb_allocations (
    id_sb_allocations UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    id_sb UUID NOT NULL,
    id_user UUID NOT NULL,
    final_amount BIGINT NOT NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_id_sb FOREIGN KEY (id_sb) REFERENCES split_bills(id_sb),
    CONSTRAINT fk_id_user_sba FOREIGN KEY (id_user) REFERENCES users(id_users),
    CONSTRAINT cek_final_amount CHECK (final_amount > 0)
);

