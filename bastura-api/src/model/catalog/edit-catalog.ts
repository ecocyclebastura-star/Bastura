import { sql } from "../connection";

export const getWasteCatalogById = async (id: string) => {
    const result = await sql`SELECT * FROM waste_catalog WHERE id_waste = ${id} AND deleted_at IS NULL LIMIT 1`;
    return result[0];
}

export const editWasteCatalog = async (
    id: string,
    updateData: any
) => {
    updateData.updated_at = sql`NOW()`;

    return await sql.begin(async (tx) => {
        const result = await tx`
            UPDATE waste_catalog
            SET ${tx(updateData)}
            WHERE id_waste = ${id} AND deleted_at IS NULL
            RETURNING id_waste
        `;
        if (result.length > 0) {
            await tx`UPDATE update_logs SET catalog_up = NOW() WHERE id_update = 1`;
        }
        return result[0];
    });
}
