import { sql } from "../connection";

export const checkWasteCatalogName = async (name: string, excludeId?: string) => {
    if (excludeId) {
        const result = await sql`
            SELECT id_waste FROM waste_catalog 
            WHERE LOWER(name) = LOWER(${name}) 
            AND deleted_at IS NULL 
            AND id_waste != ${excludeId}
            LIMIT 1
        `;
        return result.length > 0;
    } else {
        const result = await sql`
            SELECT id_waste FROM waste_catalog 
            WHERE LOWER(name) = LOWER(${name}) 
            AND deleted_at IS NULL
            LIMIT 1
        `;
        return result.length > 0;
    }
}
export const getWasteCatalogByName = async (name: string) => {
    const result = await sql`
        SELECT * FROM waste_catalog 
        WHERE LOWER(name) = LOWER(${name}) 
        LIMIT 1
    `;
    return result[0];
}

export const checkWasteCategoryExists = async (categoryId: number) => {
    const result = await sql`
        SELECT id_waste_category FROM waste_category WHERE id_waste_category = ${categoryId} LIMIT 1
    `;
    return result.length > 0;
}

export const addWasteCatalog = async (
    name: string,
    category_id: number,
    unit: string,
    price: number,
    description: string,
    catalog_img: string | null
) => {
    return await sql.begin(async (tx) => {
        const result = await tx`
            INSERT INTO waste_catalog (
                id_waste, name, category_id, unit, price, description, catalog_img, created_at
            ) VALUES (
                gen_random_uuid(), ${name}, ${category_id}, ${unit}, ${price}, ${description}, ${catalog_img}, NOW()
            ) RETURNING id_waste
        `;
        await tx`UPDATE update_logs SET catalog_up = NOW() WHERE id_update = 1`;
        return result[0];
    });
}
