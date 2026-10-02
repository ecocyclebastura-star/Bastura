import { sql } from "../connection";

export const getEducationById = async (id: string) => {
    const result = await sql`
        SELECT * FROM education_content WHERE id_content = ${id} LIMIT 1
    `;
    return result[0];
}

export const editEducation = async (id: string, updateData: any) => {
    updateData.updated_at = sql`NOW()`;
    
    // If content is being updated, ensure it's wrapped in sql.json if it's an object
    if (updateData.content && typeof updateData.content === 'object') {
        updateData.content = sql.json(updateData.content);
    }

    const result = await sql`
        UPDATE education_content
        SET ${sql(updateData)}
        WHERE id_content = ${id}
        RETURNING id_content
    `;
    return result[0];
}
