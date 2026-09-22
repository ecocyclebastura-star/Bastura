import { Context } from "hono";
import { get_warga } from "../../model/users_data/get_warga";
import { sendwargaResponse } from "../../logs/users_data/warga-logs";

export const get_warga_controller = async (c: Context) => {
    try {
        const result = await get_warga()

        if (result.length === 0) {
            return sendwargaResponse(c, 404, 'get_warga', 'error', 'Warga tidak ditemukan', 'Warga tidak ditemukan', null as any, 'ERR_WARGA_NOT_FOUND');
        }

        return sendwargaResponse(c, 200, 'get_warga', 'success', 'Get warga successfully', 'Get warga successfully', { data: result } as any, 'SUCC_GET_WARGA');
    } catch (error) {
        return sendwargaResponse(c, 500, 'get_warga', 'error', 'Failed to get warga', 'Failed to get warga', {data : error} as any, 'ERR_GET_WARGA');
    }
}