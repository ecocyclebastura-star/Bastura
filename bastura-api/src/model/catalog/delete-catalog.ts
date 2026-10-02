import { sql } from "../connection";

export const deleteWasteCatalog = async (id: string) => {
    const result = await sql`
        UPDATE waste_catalog 
        SET deleted_at = NOW() 
        WHERE id_waste = ${id} AND deleted_at IS NULL
        RETURNING id_waste
    `;
    return result[0];
}
