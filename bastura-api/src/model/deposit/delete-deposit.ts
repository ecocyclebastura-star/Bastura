import { sql } from "../connection";

export const deleteDepositModel = async (id: string, admin_id: string) => {
    return await sql.begin(async (tx) => {
        const depositRows = await tx`SELECT id_deposit, id_user, weight_dp, dp_status FROM deposit WHERE id_deposit = ${id} FOR UPDATE`;
        if (depositRows.length === 0) {
            throw { status: 404, code: 'NOT_FOUND', msg: 'Setoran tidak ditemukan.' };
        }
        
        const currentDeposit = depositRows[0];

        if (currentDeposit.dp_status !== 'processed') {
            throw { status: 409, code: 'CONFLICT', msg: 'Hanya setoran dengan status Diproses (processed) yang dapat dihapus.' };
        }

        await tx`DELETE FROM deposit WHERE id_deposit = ${id}`;

        const snapshot = {
            id_deposit: currentDeposit.id_deposit,
            id_user: currentDeposit.id_user,
            total_weight: currentDeposit.weight_dp,
            item_count: 1
        };

        await tx`
            INSERT INTO audit_logs (actor_id, target_id, action_type, details, created_at) 
            VALUES (${admin_id}, ${id}, 'DELETE_DEPOSIT', ${sql.json(snapshot)}, NOW())
        `;
    });
}
