import { Context } from "hono";
import { sql } from "../../model/connection";
import { sendDepositResponse } from "../../logs/deposit/deposit-logs";
import { validateUUID } from "../../utils/validation";
import { editDepositModel } from "../../model/deposit/edit-deposit";

export const editDepositController = async (c: Context) => {
    const action = "edit_deposit";
    try {
        const id = c.req.param('id') || '';
        if (!id || !validateUUID(id)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID setoran wajib berupa UUID.', null, 'VALIDATION_ERROR');
        }

        const body = await c.req.json();
        
        if (body.user_id) {
            return sendDepositResponse(c, 400, action, 'error', action, 'user_id tidak dapat diubah', 'User ID tidak boleh diubah.', null, 'VALIDATION_ERROR');
        }

        const category_id = body.category_id;
        const description = body.description ? (body.description as string).trim() : undefined;
        const weight_kg = body.weight_kg;

        if (category_id && !validateUUID(category_id)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'Category ID tidak valid', 'Category ID wajib berupa UUID.', null, 'VALIDATION_ERROR');
        }

        if (description !== undefined && (description.length === 0 || description.length > 150)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'Deskripsi tidak valid', 'Deskripsi maksimal 150 karakter.', null, 'VALIDATION_ERROR');
        }

        if (weight_kg !== undefined) {
            if (typeof weight_kg !== 'number' || isNaN(weight_kg) || !isFinite(weight_kg) || weight_kg <= 0 || weight_kg > 1000) {
                return sendDepositResponse(c, 400, action, 'error', action, 'Berat tidak valid', 'Berat wajib berupa angka lebih dari 0 dan maksimal 1000.', null, 'VALIDATION_ERROR');
            }
        }

        const payload = c.get('jwtPayload') as { sub: string };
        const admin_id = payload.sub;

        await editDepositModel(id, category_id, description, weight_kg, admin_id);

        return sendDepositResponse(c, 200, action, 'success', action, 'Setoran berhasil diperbarui.', 'Setoran berhasil diperbarui.', null, 'SUCCESS');
    } catch (error: any) {
        console.error("Error di edit-deposit:", error);
        
        if (error.status) {
            return sendDepositResponse(c, error.status, action, 'error', action, error.msg, error.msg, null, error.code);
        }

        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'editDepositController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendDepositResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal memperbarui setoran', null, 'INTERNAL_SERVER_ERROR');
    }
}
