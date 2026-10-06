import { sql } from '../connection'

export const editAnc = async (id: string, updateData: any) => {
    updateData.updated_at = sql`NOW()`;
    
    if (updateData.content && typeof updateData.content === 'object') {
        updateData.content = sql.json(updateData.content);
    }

    const result = await sql`
        WITH updated AS (
            UPDATE announcements
            SET ${sql(updateData)}
            WHERE id_announcements = ${id}
            RETURNING *
        )
        SELECT u.*, c.name AS category_name
        FROM updated u
        LEFT JOIN announcement_categories c ON u.category_id = c.id_category
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
