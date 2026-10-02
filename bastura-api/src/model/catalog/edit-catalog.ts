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

    const result = await sql`
        UPDATE waste_catalog
        SET ${sql(updateData)}
        WHERE id_waste = ${id} AND deleted_at IS NULL
        RETURNING id_waste
    `;
    return result[0];
}
