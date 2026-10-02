import { Context } from "hono";
import { sendEduResponse } from "../../logs/edu/edu-logs";
import { getEducationById, editEducation } from "../../model/edu/edit-edu";
import { sql } from "../../model/connection";

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const editEduController = async (c: Context) => {
    const action = "edit_edu";
    try {
        const id = c.req.param('id') as string;
        
        if (!validateUUID(id)) {
            return sendEduResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID edukasi tidak valid.', 'VALIDATION_ERROR');
        }
        const body = await c.req.json();

        const existingEdu = await getEducationById(id);
        if (!existingEdu) {
            return sendEduResponse(c, 404, action, 'error', action, 'Edukasi tidak ditemukan', 'Data edukasi tidak ditemukan.', 'EDU_NOT_FOUND');
        }

        const updateData: any = {};

        if (body.title !== undefined) {
            const title = (body.title as string).trim();
            if (title.length === 0 || title.length > 200) {
                return sendEduResponse(c, 400, action, 'error', action, 'Judul tidak valid', 'Judul edukasi tidak boleh kosong dan maksimal 200 karakter.', 'INVALID_TITLE');
            }
            updateData.title = title;
        }

        if (body.content !== undefined) {
            let contentStr = body.content;
            let contentJson: any = {};
            if (typeof contentStr === 'string') {
                try {
                    contentJson = JSON.parse(contentStr);
                } catch (err) {
                    contentJson = { text: contentStr };
                }
            } else if (typeof contentStr === 'object') {
                contentJson = contentStr;
            }

            // Preserve author_id if it exists in old content
            if (existingEdu.content && existingEdu.content.author_id) {
                contentJson.author_id = existingEdu.content.author_id;
            }
            
            updateData.content = contentJson;
        }

        if (Object.keys(updateData).length > 0) {
            await editEducation(id, updateData);
        }

        return sendEduResponse(c, 200, action, 'success', action, 'Berhasil mengedit edukasi.', 'Berhasil mengedit edukasi.', null, 'EDIT_EDU_SUCCESS');
    } catch (error: any) {
        console.error("Error di edit-edu:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'editEduController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendEduResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal mengedit edukasi', null, 'INTERNAL_SERVER_ERROR');
    }
}
