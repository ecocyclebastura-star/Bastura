import { Context } from "hono"
import { sendAncResponse } from "../../logs/anc/anc-logs"
import { getAncById } from "../../model/anc/get-announcements"
import { deleteAnc } from "../../model/anc/edit-delete-anc"
import { sql } from "../../model/connection"
import path from "node:path"

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const deleteAncController = async (c: Context) => {
    const action = "delete_anc";
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const authorId = payload?.sub;

        if (!authorId) {
            return sendAncResponse(c, 401, action, 'error', action, 'Unauthorized', 'Gagal memverifikasi user.', undefined, 'UNAUTHORIZED');
        }

        const id = c.req.param('id');
        if (!id || !validateUUID(id)) {
            return sendAncResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID pengumuman tidak valid atau tidak ditemukan.', undefined, 'VALIDATION_ERROR');
        }

        const existingAnc = await getAncById(id);
        if (!existingAnc) {
            return sendAncResponse(c, 404, action, 'error', action, 'Pengumuman tidak ditemukan', 'Pengumuman tidak ditemukan.', undefined, 'NOT_FOUND');
        }

        // Delete from DB
        await deleteAnc(id);

        // Audit Log
        await sql`INSERT INTO audit_logs (actor_id, target_id, action_type, created_at) VALUES (${authorId}, ${id}, 'DELETE_ANC', NOW())`;

        // Delete file
        if (existingAnc.announcements_img) {
            const dirpath = path.join(import.meta.dir, '..', '..', 'img', 'anc');
            const oldfilepath = path.join(dirpath, existingAnc.announcements_img);
            const oldfile = Bun.file(oldfilepath);
            try {
                if (await oldfile.exists()) {
                    await oldfile.delete();
                }
            } catch (err: any) {
                console.error("Gagal menghapus file lama:", err);
                try {
                    await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${err.message}, 'WARNING', 'deleteAncController_file', NOW())`;
                } catch (e) {
                    console.error(e);
                }
            }
        }

        return sendAncResponse(c, 200, action, 'success', action, 'Berhasil menghapus pengumuman.', 'Berhasil menghapus pengumuman.', undefined, 'DELETE_ANC_SUCCESS');
    } catch (error: any) {
        console.error("Error di delete-anc:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'deleteAncController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendAncResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menghapus pengumuman', undefined, 'INTERNAL_SERVER_ERROR');
    }
}
