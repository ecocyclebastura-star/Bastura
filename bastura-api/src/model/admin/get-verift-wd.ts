import { sql } from "../connection";

export const getVerifyWithdrawal = async (id_admin: string) => {
    try {
        const result = await sql.begin(async (tx) => {

            const is_admin = await tx`SELECT role_id FROM users WHERE id_users = ${id_admin}`;
            if (is_admin.length === 0) {
                return 'ERR_ADMIN_NOT_FOUND';
            }
            if(is_admin[0].role_id === 1){
                return 'ERR_NOT_ADMIN';
            }

            const is_wd = await tx`SELECT * FROM view_penarikan_warga  WHERE status = 'processed'`;
            if(is_wd.length === 0){
                return 'ERR_WD_NOT_FOUND';
            }
            return is_wd;
        }) 
        return result;
    } catch (error) {
        throw error;
    }
}