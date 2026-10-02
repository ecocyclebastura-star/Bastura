import { Context } from "hono";
import { sendEduResponse } from "../../logs/edu/edu-logs";
import { getEducationById } from "../../model/edu/edit-edu";
import { deleteEducation } from "../../model/edu/delete-edu";
import { sql } from "../../model/connection";

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const deleteEduController = async (c: Context) => {
    const action = "delete_edu";
    try {
        const id = c.req.param('id');
        
        if (!id || !validateUUID(id)) {
            return sendEduResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID edukasi tidak valid.', 'VALIDATION_ERROR');
        }

        const existingEdu = await getEducationById(id);
        if (!existingEdu) {
            return sendEduResponse(c, 404, action, 'error', action, 'Edukasi tidak ditemukan', 'Data edukasi tidak ditemukan.', 'EDU_NOT_FOUND');
        }

        await deleteEducation(id);

        return sendEduResponse(c, 200, action, 'success', action, 'Berhasil menghapus edukasi.', 'Berhasil menghapus edukasi.', null, 'DELETE_EDU_SUCCESS');
    } catch (error: any) {
        console.error("Error di delete-edu:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'deleteEduController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendEduResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menghapus edukasi', null, 'INTERNAL_SERVER_ERROR');
    }
}
