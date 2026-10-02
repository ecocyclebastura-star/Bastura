import { sql } from "../connection";

export const addEducation = async (
    title: string,
    content: any,
    education_img: string | null
) => {
    const result = await sql`
        INSERT INTO education_content (
            id_content, title, content, education_img, created_at
        ) VALUES (
            gen_random_uuid(), ${title}, ${sql.json(content)}, ${education_img}, NOW()
        ) RETURNING id_content
    `;
    return result[0];
}
