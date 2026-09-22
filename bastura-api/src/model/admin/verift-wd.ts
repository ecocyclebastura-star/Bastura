import {sql} from '../connection';

export const veriftyWD = async (id_admin: string, id_tsc: string, proccess_type: string) => {
    try {
        const result = await sql.begin(async (tx) => {

            const check_admin = await tx`SELECT role_id FROM users WHERE id_users = ${id_admin}`;
            if (check_admin.length === 0) {
                return 'ERR_ADMIN_NOT_FOUND';
            }
            if (check_admin[0].role_id == 1) {
                return 'ERR_NOT_ADMIN';
            }

            const get_amount = await tx`SELECT amount, id_user FROM withdrawals WHERE id_wd = ${id_tsc}`;
            if (get_amount.length === 0) {
                return 'ERR_WD_NOT_FOUND';
            }

            if (proccess_type == 'success') {
                const update_balance = await tx`
                    UPDATE balance 
                    SET total_balance = total_balance - ${get_amount[0].amount}, updated_at = ${new Date()} 
                    WHERE id_user = ${get_amount[0].id_user} 
                    RETURNING total_balance, id_user
                `;
                
                const update_wd = await tx`
                    UPDATE withdrawals 
                    SET wd_status = 'success', updated_at = ${new Date()}
                    WHERE id_wd = ${id_tsc}
                    RETURNING wd_status
                `;
                
                return {
                    success: update_wd[0].wd_status,
                    balance: update_balance[0].total_balance,
                    id_users: update_balance[0].id_user
                };
            }

            if (proccess_type == 'canceled') {
                const update_wd = await tx`
                    UPDATE withdrawals 
                    SET wd_status = 'canceled', updated_at = ${new Date()}
                    WHERE id_wd = ${id_tsc}
                    RETURNING wd_status
                `;
                
                return {
                    success: update_wd[0].wd_status,
                    id_users: get_amount[0].id_user
                };
            }
            
            // tambahin update api di tabel update 
            return 'ERR_PROCCESS_NOT_FOUND';
        });
        
        return result;
    } catch (error) {
        console.error('Error verifying withdrawal from database!', error);
        throw error;
    }
}