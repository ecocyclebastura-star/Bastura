import { Context } from "hono";
import { sql } from "../../model/connection";
import { sendDepositResponse } from "../../logs/deposit/deposit-logs";
import { validateUUID } from "../../utils/validation";
import { addDepositModel } from "../../model/deposit/add-deposit";

export const addDepositController = async (c: Context) => {
    const action = "add_deposit";
    try {
        const body = await c.req.json();
        
        const user_id = body.user_id;
        const category_id = body.category_id; // Maps to catalog_id in DB
        const description = (body.description as string)?.trim() || '';
        const weight_kg = body.weight_kg;

        // Validation
        if (!user_id || !validateUUID(user_id)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'User ID tidak valid', 'User ID wajib diisi dan berupa UUID.', null, 'VALIDATION_ERROR');
        }

        if (!category_id || !validateUUID(category_id)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'Category ID tidak valid', 'Category ID wajib diisi dan berupa UUID.', null, 'VALIDATION_ERROR');
        }

        if (!description || description.length === 0 || description.length > 150) {
            return sendDepositResponse(c, 400, action, 'error', action, 'Deskripsi tidak valid', 'Deskripsi wajib diisi dan maksimal 150 karakter.', null, 'VALIDATION_ERROR');
        }

        if (typeof weight_kg !== 'number' || isNaN(weight_kg) || !isFinite(weight_kg) || weight_kg <= 0 || weight_kg > 1000) {
            return sendDepositResponse(c, 400, action, 'error', action, 'Berat tidak valid', 'Berat wajib diisi berupa angka lebih dari 0 dan maksimal 1000.', null, 'VALIDATION_ERROR');
        }

        // Get admin who creates this
        const payload = c.get('jwtPayload') as { sub: string };
        const admin_id = payload.sub;

        const result = await addDepositModel(user_id, category_id, weight_kg, description, admin_id);

        return sendDepositResponse(c, 201, action, 'success', action, 'Setoran berhasil ditambahkan.', 'Setoran berhasil ditambahkan.', { id_deposit: result }, 'SUCCESS');
    } catch (error: any) {
        console.error("Error di add-deposit:", error);
        
        if (error.status) {
            return sendDepositResponse(c, error.status, action, 'error', action, error.msg, error.msg, null, error.code);
        }

        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'addDepositController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendDepositResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menambahkan setoran', null, 'INTERNAL_SERVER_ERROR');
    }
}
