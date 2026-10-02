import { sql } from "../connection";

export const getAdminEduList = async () => {
    const result = await sql`
        SELECT * FROM view_education 
        ORDER BY created_at DESC
    `;
    return result;
}

export const getAdminEduById = async (id: string) => {
    const result = await sql`
        SELECT * FROM view_education 
        WHERE id_content = ${id} 
        LIMIT 1
    `;
    return result[0];
}
