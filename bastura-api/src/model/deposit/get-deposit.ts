import { sql } from "../connection";

export const getDepositsModel = async (
    search: string | null, 
    statusRaw: string | undefined, 
    limit: number, 
    offset: number
) => {
    const results = await sql`
        SELECT 
            d.id_deposit AS id, 
            u.id_users AS user_id, 
            u.name AS user_name, 
            wc.name AS catalog_name, 
            wcat.category_name AS category_name, 
            d.weight_dp AS total_weight, 
            d.dp_status AS status, 
            d.created_at,
            COUNT(*) OVER() AS total_count
        FROM deposit d
        JOIN users u ON d.id_user = u.id_users
        JOIN waste_catalog wc ON d.catalog_id = wc.id_waste
        JOIN waste_category wcat ON wc.category_id = wcat.id_waste_category
        WHERE 
            (${search || null}::text IS NULL OR u.name ILIKE '%' || ${search || null} || '%')
            AND (${statusRaw || null}::text IS NULL OR d.dp_status = ${statusRaw || null}::status_tf)
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const total = results.length > 0 ? Number(results[0].total_count) : 0;
    
    const data = results.map(row => {
        const { total_count, ...rest } = row;
        return {
            id: rest.id,
            user: { id: rest.user_id, name: rest.user_name },
            category: { name: rest.category_name, catalog_name: rest.catalog_name },
            total_weight: rest.total_weight,
            status: rest.status,
            created_at: rest.created_at
        };
    });

    return { data, total };
}

export const getDepositDetailModel = async (id: string) => {
    const result = await sql`
        SELECT 
            d.id_deposit AS id, 
            u.id_users AS user_id, 
            u.name AS user_name, 
            u.phone AS user_phone, 
            d.catalog_id AS category_id, 
            wc.name AS catalog_name, 
            wcat.category_name AS category_name, 
            d.dp_notes AS description, 
            d.weight_dp AS weight, 
            d.dp_status AS status, 
            d.created_at,
            d.updated_at,
            d.created_by AS admin_id,
            admin.name AS admin_name
        FROM deposit d
        JOIN users u ON d.id_user = u.id_users
        JOIN waste_catalog wc ON d.catalog_id = wc.id_waste
        JOIN waste_category wcat ON wc.category_id = wcat.id_waste_category
        LEFT JOIN users admin ON d.created_by = admin.id_users
        WHERE d.id_deposit = ${id}
        LIMIT 1
    `;

    return result.length > 0 ? result[0] : null;
}
