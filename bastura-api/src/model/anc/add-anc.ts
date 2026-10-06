import { sql } from '../connection'

export const addAnc = async (
    title: string,
    category_id: string,
    content: any,
    announcements_img: string | null
) => {
    const result = await sql`
        WITH inserted AS (
            INSERT INTO announcements (
                id_announcements, title, category_id, content, announcements_img, created_at
            ) VALUES (
                gen_random_uuid(), ${title}, ${category_id}, ${sql.json(content)}, ${announcements_img}, NOW()
            ) RETURNING *
        )
        SELECT i.*, c.name AS category_name
        FROM inserted i
        LEFT JOIN announcement_categories c ON i.category_id = c.id_category
    `;
    return result[0];
}

export const checkCategoryExists = async (category_id: string) => {
    const result = await sql`
        SELECT id_category FROM announcement_categories WHERE id_category = ${category_id} LIMIT 1
    `;
    return result.length > 0;
}
