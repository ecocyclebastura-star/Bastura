import { sql } from '../connection'

export const editAnc = async (id: string, updateData: any) => {
    updateData.updated_at = sql`NOW()`;
    
    if (updateData.content && typeof updateData.content === 'object') {
        updateData.content = sql.json(updateData.content);
    }

    const result = await sql`
        UPDATE announcements
        SET ${sql(updateData)}
        WHERE id_announcements = ${id}
        RETURNING id_announcements
    `;
    return result[0];
}

export const deleteAnc = async (id: string) => {
    const result = await sql`
        DELETE FROM announcements 
        WHERE id_announcements = ${id}
        RETURNING id_announcements, title
    `;
    return result[0];
}
