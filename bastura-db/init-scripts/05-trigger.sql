CREATE OR REPLACE FUNCTION sync_user_balance()
RETURNS TRIGGER AS $$
BEGIN

    UPDATE users
    SET 
        total_balance = NEW.total_balance,
        updated_at = NOW()
    WHERE id_users = NEW.id_user;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_sync_user_balance
AFTER INSERT OR UPDATE OF total_balance ON balance
FOR EACH ROW
EXECUTE FUNCTION sync_user_balance();

-- Trigger untuk Update Logs Announcements
CREATE OR REPLACE FUNCTION update_logs_announcements()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE update_logs SET announcements_up = NOW() WHERE id_update = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcements
AFTER INSERT OR UPDATE OR DELETE ON announcements
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_announcements();

-- Trigger untuk Update Logs Education
CREATE OR REPLACE FUNCTION update_logs_education()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE update_logs SET education_up = NOW() WHERE id_update = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_education
AFTER INSERT OR UPDATE OR DELETE ON education_content
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_education();

-- Trigger untuk Update Logs Deposit (Masuk ke transaction_up)
CREATE OR REPLACE FUNCTION update_logs_deposit()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE update_logs SET transaction_up = NOW() WHERE id_update = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deposit
AFTER INSERT OR UPDATE OR DELETE ON deposit
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_deposit();


-- Trigger untuk Update Logs Profile (users -> profile_up)
CREATE OR REPLACE FUNCTION update_logs_profile()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE update_logs SET profile_up = NOW() WHERE id_update = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_profile
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_profile();

-- Trigger untuk Update Logs Transaction (withdrawals -> transaction_up)
CREATE OR REPLACE FUNCTION update_logs_transaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE update_logs SET transaction_up = NOW() WHERE id_update = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_withdrawals
AFTER INSERT OR UPDATE OR DELETE ON withdrawals
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_transaction();

-- Trigger untuk Update Logs Transaction (split_bills & sb_allocations -> transaction_up)
CREATE TRIGGER trigger_update_split_bills
AFTER INSERT OR UPDATE OR DELETE ON split_bills
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_transaction();

CREATE TRIGGER trigger_update_sb_allocations
AFTER INSERT OR UPDATE OR DELETE ON sb_allocations
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_transaction();

-- Trigger untuk Update Logs Simba (simba_content -> simba_up)
CREATE OR REPLACE FUNCTION update_logs_simba()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE update_logs SET simba_up = NOW() WHERE id_update = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_simba
AFTER INSERT OR UPDATE OR DELETE ON simba_content
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_simba();

-- Trigger untuk Update Logs Catalog (waste_catalog & waste_category -> catalog_up)
CREATE OR REPLACE FUNCTION update_logs_catalog()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE update_logs SET catalog_up = NOW() WHERE id_update = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_catalog
AFTER INSERT OR UPDATE OR DELETE ON waste_catalog
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_catalog();

CREATE TRIGGER trigger_update_catalog_category
AFTER INSERT OR UPDATE OR DELETE ON waste_category
FOR EACH STATEMENT
EXECUTE FUNCTION update_logs_catalog();
