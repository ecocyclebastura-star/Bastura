import { Context } from "hono";
import { getOpeningSchModel } from "../../model/update/get-opening-sch";
import { sendAuthResponse } from "../../logs/auth/auth-logs";

export const getOpeningSchController = async (c: Context) => {
    try {
        const payload = c.get('jwtPayload') as any;
        const id_user : string = payload.sub as string;

        if (!payload) {
            return sendAuthResponse(c, 401, 'error', 'get_opening_sch', 'Unauthorized: Token tidak valid', 'Unauthorized: Token tidak valid', null, 'ERR_UNAUTHORIZED');
        }

        const result = await getOpeningSchModel()

        if (result.length === 0){
            return sendAuthResponse(c, 404, 'success', 'get_opening_sch', 'Jadwal setoran belum tersedia atau belum diatur.', 'Jadwal setoran belum tersedia atau belum diatur.', {data : result}, 'SUCC_OPENING_SCH_NOT_FOUND')
        }
        
        return sendAuthResponse(c, 200, 'success', 'get_opening_sch', 'Opening schedule fetched successfully', 'Opening schedule fetched successfully', {data : result}, 'SUCC_OPENING_SCH_FETCHED')
    } catch (error) {
        return sendAuthResponse(c, 500, 'error', 'get_opening_sch', 'Failed to get opening schedule', 'Failed to get opening schedule', error, 'ERR_OPENING_SCH_FETCHED')
    }
}