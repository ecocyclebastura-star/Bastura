import { sql } from "../connection"

export const updateAdminContactModel = async (phone: string) => {
    try {
        const result = await sql.begin(async (tx) => {
            const updated = await tx`
                UPDATE users 
                SET phone = ${phone}, updated_at = now()
                WHERE role_id = 3 
                RETURNING email, phone
            `;
            if (updated.length > 0) {
                await tx`UPDATE update_logs SET profile_up = now() WHERE id_update = 1`;
            }
            return updated;
        });
        return result;
    } catch (error) {
        console.error('Error updating admin contact in database!', error)
        throw error
    }
}
