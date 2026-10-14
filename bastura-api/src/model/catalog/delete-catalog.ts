import { sql } from "../connection";

export const deleteWasteCatalog = async (id: string) => {
    return await sql.begin(async (tx) => {
        const result = await tx`
            UPDATE waste_catalog 
            SET deleted_at = NOW() 
            WHERE id_waste = ${id} AND deleted_at IS NULL
            RETURNING id_waste
        `;
        if (result.length > 0) {
            await tx`UPDATE update_logs SET catalog_up = NOW() WHERE id_update = 1`;
        }
        return result[0];
    });
}
