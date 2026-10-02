import { Context } from "hono";
import { sendEduResponse } from "../../logs/edu/edu-logs";
import { addEducation } from "../../model/edu/add-edu";
import { sql } from "../../model/connection";

export const addEduController = async (c: Context) => {
    const action = "add_edu";
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const authorId = payload?.sub;

        if (!authorId) {
            return sendEduResponse(c, 401, action, 'error', action, 'Unauthorized', 'Gagal memverifikasi user.', 'UNAUTHORIZED');
        }

        const body = await c.req.json();
        const title = (body.title as string)?.trim();
        let contentStr = body.content;

        if (!title || title.length === 0 || title.length > 200) {
            return sendEduResponse(c, 400, action, 'error', action, 'Judul tidak valid', 'Judul edukasi wajib diisi dan maksimal 200 karakter.', 'INVALID_TITLE');
        }

        if (!contentStr) {
            return sendEduResponse(c, 400, action, 'error', action, 'Isi edukasi kosong', 'Isi konten edukasi wajib diisi.', 'INVALID_CONTENT');
        }

        // Parse content to json if it's string
        let contentJson: any = {};
        if (typeof contentStr === 'string') {
            try {
                contentJson = JSON.parse(contentStr);
            } catch (err) {
                // If it's just raw text, we wrap it in a text property
                contentJson = { text: contentStr };
            }
        } else if (typeof contentStr === 'object') {
            contentJson = contentStr;
        }

        // Embed author_id to maintain reference to the admin who created it
        contentJson.author_id = authorId;

        const result = await addEducation(title, contentJson, null);

        return sendEduResponse(c, 201, action, 'success', action, 'Edukasi berhasil ditambahkan.', 'Artikel edukasi berhasil ditambahkan.', { id_content: result.id_content }, 'ADD_EDU_SUCCESS');
    } catch (error: any) {
        console.error("Error di add-edu:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'addEduController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendEduResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menambahkan artikel edukasi', null, 'INTERNAL_SERVER_ERROR');
    }
}
