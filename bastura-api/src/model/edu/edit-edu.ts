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

    return await sql.begin(async (tx) => {
        const result = await tx`
            UPDATE education_content
            SET ${tx(updateData)}
            WHERE id_content = ${id}
            RETURNING id_content
        `;
        if (result.length > 0) {
            await tx`UPDATE update_logs SET education_up = NOW() WHERE id_update = 1`;
        }
        return result[0];
    });
}
