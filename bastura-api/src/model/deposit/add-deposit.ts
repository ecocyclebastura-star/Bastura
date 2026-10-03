import { sql } from "../connection";

export const addDepositModel = async (
    user_id: string, 
    category_id: string, 
    weight_kg: number, 
    description: string, 
    admin_id: string
) => {
    return await sql.begin(async (tx) => {
        // Check user
        const userRows = await tx`SELECT id_users, role_id, status_active FROM users WHERE id_users = ${user_id} LIMIT 1`;
        if (userRows.length === 0) {
            throw { status: 404, code: 'NOT_FOUND', msg: 'Warga tidak ditemukan.' };
        }
        if (userRows[0].role_id !== 1) {
            throw { status: 400, code: 'VALIDATION_ERROR', msg: 'ID yang diberikan bukan warga.' };
        }

        // Check catalog
        const catalogRows = await tx`SELECT id_waste FROM waste_catalog WHERE id_waste = ${category_id} AND deleted_at IS NULL LIMIT 1`;
        if (catalogRows.length === 0) {
            throw { status: 400, code: 'VALIDATION_ERROR', msg: 'Kategori sampah tidak ditemukan.' };
        }

        // Insert deposit
        const insertResult = await tx`
            INSERT INTO deposit (id_user, catalog_id, weight_dp, dp_notes, dp_status, created_by, created_at)
            VALUES (${user_id}, ${category_id}, ${weight_kg}, ${description}, 'processed', ${admin_id}, NOW())
            RETURNING id_deposit
        `;
        const id_deposit = insertResult[0].id_deposit;

        // Audit log
        await tx`
            INSERT INTO audit_logs (actor_id, target_id, action_type, details, created_at) 
            VALUES (${admin_id}, ${id_deposit}, 'ADD_DEPOSIT', ${sql.json({ total_weight: weight_kg })}, NOW())
        `;

        return id_deposit;
    });
}
