import { sql } from "../connection";

export const blockUser = async (id_user: string, id_admin: string) => {
    const result = await sql.begin(async (tx) => {
        const check_admin = await tx`SELECT role_id , status_active FROM users WHERE id_users = ${id_admin}`;
        if (!check_admin || check_admin.length === 0) {
            return "ACCESS_DENIED_UR_NOT_ADMIN";
        }

        if (check_admin[0].role_id === 1) {
            return "ACCESS_DENIED_UR_NOT_ADMIN";
        }

        const balance = await tx`
            UPDATE users 
            SET balance_held = total_balance, updated_at = now() 
            WHERE id_users = ${id_user}
            RETURNING id_users, balance_held, updated_at
        `;

        const disable_balance = await tx`
            UPDATE balance 
            SET total_balance = 0, updated_at = now()  
            WHERE id_user = ${id_user} AND total_balance > 0 
            RETURNING id_user, total_balance, updated_at
        `;
        
        const result = await tx`
            UPDATE users 
            SET status_active = 'blocked', updated_at = now(), blocked_at = now()  
            WHERE id_users = ${id_user} AND role_id = 1 AND id_users != ${id_admin} 
            RETURNING id_users, email, name, phone, status_active, blocked_at
        `;
        
        if (!result || result.length === 0) {
            return "USER_NOT_FOUND";
        }
        return result;
    })
    
    return result;
}