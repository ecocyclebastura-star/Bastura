import { Context } from "hono";
import { insert_setoran_sch } from "../../model/update/upload-opening-sch";
import { sendAuthResponse } from "../../logs/auth/auth-logs";


export const insert_setoran_controller = async (c : Context) => {
    try {
        
        const body = await c.req.parseBody();
        const payload = c.get('jwtPayload') as any;
        const time : string = body.time as string;
        const id_user : string = payload.sub as string;


        if (!time) {
            return sendAuthResponse(c, 400, 'error', 'insert_setoran', 'Time is required', 'Time is required', null, 'ERR_MISSING_TIME');
        }

        if (!payload) {
            return sendAuthResponse(c, 401, 'error', 'insert_setoran', 'Unauthorized: Token tidak valid', 'Unauthorized: Token tidak valid', null, 'ERR_UNAUTHORIZED');
        }

        const result = await insert_setoran_sch(time, id_user);

        if (result === "JADWAL_BERHASIL") {
            return sendAuthResponse(c, 200, 'success', 'insert_setoran', 'Schedule inserted successfully', 'Schedule inserted successfully', result, 'SUCC_JADWAL_INSERTED');
        }

        return sendAuthResponse(c, 400, 'error', 'insert_setoran', 'Failed to insert schedule', 'Failed to insert schedule', result ,'ERR_JADWAL_INSERTION');
    } catch (error) {
        return sendAuthResponse(c, 500, 'error', 'insert_setoran', 'Failed to insert schedule', 'Failed to insert schedule', error, 'ERR_JADWAL_INSERTION');
    }
}