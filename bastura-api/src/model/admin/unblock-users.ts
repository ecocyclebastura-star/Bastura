import { sql } from "../connection";

export const unblockUser = async (id_user: string, id_admin: string) => {
    const result = await sql.begin(async (tx) => {
        const check_admin = await tx`SELECT role_id FROM users WHERE id_users = ${id_admin}`;
        if (!check_admin || check_admin.length === 0 || check_admin[0].role_id === 1) {
            return "ACCESS_DENIED_UR_NOT_ADMIN";
        }
        const user = await tx`
            UPDATE users 
            SET 
                status_active = 'active', 
                total_balance = total_balance + COALESCE(balance_held, 0),
                balance_held = 0,
                blocked_at = NULL,
                updated_at = now()
            WHERE id_users = ${id_user} AND role_id = 1 
            RETURNING id_users, email, name, phone, status_active, blocked_at, total_balance, balance_held
        `;
        
        if (!user || user.length === 0) {
            return "USER_NOT_FOUND";
        }

        await tx`
            UPDATE balance
            SET total_balance = ${user[0].total_balance}, updated_at = now()
            WHERE id_user = ${id_user}
        `;
        
        return user[0];
    })
    
    return result;
}