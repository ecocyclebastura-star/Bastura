import { sql } from '../connection'

export const editAnc = async (id: string, updateData: any) => {
    updateData.updated_at = sql`NOW()`;
    
    if (updateData.content && typeof updateData.content === 'object') {
        updateData.content = sql.json(updateData.content);
    }

    return await sql.begin(async (tx) => {
        const result = await tx`
            WITH updated AS (
                UPDATE announcements
                SET ${tx(updateData)}
                WHERE id_announcements = ${id}
                RETURNING *
            )
            SELECT u.*, c.name AS category_name
            FROM updated u
            LEFT JOIN announcement_categories c ON u.category_id = c.id_category
        `;
        if (result.length > 0) {
            await tx`UPDATE update_logs SET announcements_up = NOW() WHERE id_update = 1`;
        }
        return result[0];
    });
}

export const deleteAnc = async (id: string) => {
    return await sql.begin(async (tx) => {
        const result = await tx`
            DELETE FROM announcements 
            WHERE id_announcements = ${id}
            RETURNING id_announcements, title
        `;
        if (result.length > 0) {
            await tx`UPDATE update_logs SET announcements_up = NOW() WHERE id_update = 1`;
        }
        return result[0];
    });
}
