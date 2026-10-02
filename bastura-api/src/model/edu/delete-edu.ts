import { sql } from "../connection";

export const deleteEducation = async (id: string) => {
    const result = await sql`
        DELETE FROM education_content 
        WHERE id_content = ${id}
        RETURNING id_content
    `;
    return result[0];
}
