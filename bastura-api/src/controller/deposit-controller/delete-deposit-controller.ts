import { Context } from "hono";
import { sql } from "../../model/connection";
import { sendDepositResponse } from "../../logs/deposit/deposit-logs";
import { validateUUID } from "../../utils/validation";
import { deleteDepositModel } from "../../model/deposit/delete-deposit";

export const deleteDepositController = async (c: Context) => {
    const action = "delete_deposit";
    try {
        const id = c.req.param('id') || '';
        if (!id || !validateUUID(id)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID setoran wajib berupa UUID.', null, 'VALIDATION_ERROR');
        }

        const payload = c.get('jwtPayload') as { sub: string };
        const admin_id = payload.sub;

        await deleteDepositModel(id, admin_id);

        return sendDepositResponse(c, 200, action, 'success', action, 'Setoran berhasil dihapus.', 'Setoran berhasil dihapus.', null, 'SUCCESS');
    } catch (error: any) {
        console.error("Error di delete-deposit:", error);
        
        if (error.status) {
            return sendDepositResponse(c, error.status, action, 'error', action, error.msg, error.msg, null, error.code);
        }

        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'deleteDepositController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendDepositResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menghapus setoran', null, 'INTERNAL_SERVER_ERROR');
    }
}
