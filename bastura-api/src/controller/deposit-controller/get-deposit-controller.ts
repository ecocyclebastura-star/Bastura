import { Context } from "hono";
import { sendDepositResponse } from "../../logs/deposit/deposit-logs";
import { validateUUID } from "../../utils/validation";
import { getDepositsModel, getDepositDetailModel } from "../../model/deposit/get-deposit";

export const getDepositsController = async (c: Context) => {
    const action = "list_deposits";
    try {
        const searchRaw = c.req.query('search');
        const statusRaw = c.req.query('status');
        const pageRaw = c.req.query('page');
        const limitRaw = c.req.query('limit');

        let search = null;
        if (searchRaw) {
            search = searchRaw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        }

        if (statusRaw && !['processed', 'canceled', 'success', 'rejected', 'deleted'].includes(statusRaw)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'Status tidak valid', 'Status tidak valid.', null, 'VALIDATION_ERROR');
        }

        const page = Math.max(1, parseInt(pageRaw || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(limitRaw || '10', 10)));
        const offset = (page - 1) * limit;

        const { data, total } = await getDepositsModel(search, statusRaw, limit, offset);

        return sendDepositResponse(c, 200, action, 'success', action, 'Berhasil', 'Berhasil mengambil daftar setoran.', { data, total, page, limit }, 'SUCCESS');
    } catch (error: any) {
        console.error("Error di get-deposits:", error);
        return sendDepositResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal mengambil daftar setoran', null, 'INTERNAL_SERVER_ERROR');
    }
}

export const getDepositDetailController = async (c: Context) => {
    const action = "detail_deposit";
    try {
        const id = c.req.param('id') || '';
        if (!id || !validateUUID(id)) {
            return sendDepositResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID setoran wajib berupa UUID.', null, 'VALIDATION_ERROR');
        }

        const row = await getDepositDetailModel(id);

        if (!row) {
            return sendDepositResponse(c, 404, action, 'error', action, 'Tidak ditemukan', 'Setoran tidak ditemukan.', null, 'NOT_FOUND');
        }
        const data = {
            id: row.id,
            user: { id: row.user_id, name: row.user_name, phone: row.user_phone },
            items: [
                {
                    id: row.id, // ID is just deposit ID since there are no true items
                    category_id: row.category_id,
                    category_name: row.category_name,
                    catalog_name: row.catalog_name,
                    description: row.description,
                    weight_kg: row.weight
                }
            ],
            total_weight: row.weight,
            status: row.status,
            created_by: { id: row.admin_id, name: row.admin_name },
            created_at: row.created_at,
            updated_at: row.updated_at
        };

        return sendDepositResponse(c, 200, action, 'success', action, 'Berhasil', 'Berhasil mengambil detail setoran.', data, 'SUCCESS');
    } catch (error: any) {
        console.error("Error di get-deposit-detail:", error);
        return sendDepositResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal mengambil detail setoran', null, 'INTERNAL_SERVER_ERROR');
    }
}
