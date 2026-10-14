import { sql } from "../connection";

export const addEducation = async (
    title: string,
    content: any,
    education_img: string | null
) => {
    return await sql.begin(async (tx) => {
        const result = await tx`
            INSERT INTO education_content (
                id_content, title, content, education_img, created_at
            ) VALUES (
                gen_random_uuid(), ${title}, ${sql.json(content)}, ${education_img}, NOW()
            ) RETURNING id_content
        `;
        await tx`UPDATE update_logs SET education_up = NOW() WHERE id_update = 1`;
        return result[0];
    });
}
