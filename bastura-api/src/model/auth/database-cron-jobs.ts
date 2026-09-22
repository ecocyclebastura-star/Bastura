import { sql } from '../connection'

export const AccessTimer = () => {
    const runTimer = async () => {
        try {
            await sql`DELETE FROM refresh_tokens WHERE access_expired < now() - INTERVAL '15 minutes'`;
        } catch (error) {
            console.error('Error: Access Token gagal dihapus dari database!', error);
        } finally {
            setTimeout(runTimer, 60000);
        }
    };
    runTimer();
};

