import { sql } from "../connection";

export const editDepositModel = async (
    id: string,
    category_id: string | undefined,
    description: string | undefined,
    weight_kg: number | undefined,
    admin_id: string
) => {
    return await sql.begin(async (tx) => {
        const depositRows = await tx`SELECT id_deposit, id_user, dp_status, weight_dp FROM deposit WHERE id_deposit = ${id} FOR UPDATE`;
        if (depositRows.length === 0) {
            throw { status: 404, code: 'NOT_FOUND', msg: 'Setoran tidak ditemukan.' };
        }
        const currentDeposit = depositRows[0];

        if (currentDeposit.dp_status !== 'processed') {
            throw { status: 409, code: 'CONFLICT', msg: 'Hanya setoran dengan status Diproses (processed) yang dapat diubah.' };
        }

        if (category_id) {
            const catalogRows = await tx`SELECT id_waste FROM waste_catalog WHERE id_waste = ${category_id} AND deleted_at IS NULL LIMIT 1`;
            if (catalogRows.length === 0) {
                throw { status: 400, code: 'VALIDATION_ERROR', msg: 'Kategori sampah tidak ditemukan.' };
            }
        }

        const new_category_id = category_id !== undefined ? category_id : null;
        const new_weight = weight_kg !== undefined ? weight_kg : null;
        const new_description = description !== undefined ? description : null;
        
        await tx`
            UPDATE deposit
            SET 
                catalog_id = COALESCE(${new_category_id}, catalog_id),
                dp_notes = COALESCE(${new_description}, dp_notes),
                weight_dp = COALESCE(${new_weight}::BIGINT, weight_dp),
                updated_at = NOW()
            WHERE id_deposit = ${id}
        `;

        await tx`
            INSERT INTO audit_logs (actor_id, target_id, action_type, details, created_at) 
            VALUES (${admin_id}, ${id}, 'EDIT_DEPOSIT', ${sql.json({ old_weight: currentDeposit.weight_dp, new_weight: new_weight || currentDeposit.weight_dp })}, NOW())
        `;
    });
}
