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
