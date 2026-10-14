import { sql } from "../connection";

export const deleteEducation = async (id: string) => {
    return await sql.begin(async (tx) => {
        const result = await tx`
            DELETE FROM education_content 
            WHERE id_content = ${id}
            RETURNING id_content
        `;
        if (result.length > 0) {
            await tx`UPDATE update_logs SET education_up = NOW() WHERE id_update = 1`;
        }
        return result[0];
    });
}
