import {Context} from 'hono';
import {veriftyWD} from '../../model/admin/verift-wd';
import { sendtscResponse } from '../../logs/tsc/tsc-logs';

export const verifty_wd = async(c : Context) => {

    try{
    
    const payload = (await c.req.json()) as any;
    const token = c.get('jwtPayload') as any ;
    const id_admin = token.sub;

    const id_tsc = payload.id_tsc;
    const proccess_type = payload.proccess_type;

    if (!id_admin || id_admin === undefined) {
        return sendtscResponse(c, 401, 'VERIFY_WD', 'error', 'from', 'Unauthorized', 'Unauthorized', null, 'TOKEN_INVALID');
    }

    if ( !id_tsc || !proccess_type || id_tsc === undefined || proccess_type === undefined) {
        return sendtscResponse(c, 400, 'VERIFY_WD', 'error', 'from', 'Bad Request', 'Bad Request', null, 'BAD_REQUEST');
    }   
    
    const result = await veriftyWD(id_admin, id_tsc , proccess_type);
    if (result === 'ERR_NOT_ADMIN') {
        return sendtscResponse(c, 401, 'VERIFY_WD', 'error', 'from', 'Unauthorized', 'Unauthorized', null, 'TOKEN_INVALID');
    }
    if (result === 'ERR_WD_NOT_FOUND') {
        return sendtscResponse(c, 404, 'VERIFY_WD', 'error', 'from', 'Not Found', 'Not Found', null, 'NOT_FOUND');
    }
    if (result === 'ERR_PROCCESS_NOT_FOUND') {
        return sendtscResponse(c, 400, 'VERIFY_WD', 'error', 'from', 'Bad Request', 'Bad Request', null, 'BAD_REQUEST');
    }
    return sendtscResponse(c, 200, 'VERIFY_WD', 'success', 'from', 'Success', 'Success', result, 'SUCCESS');

    }catch(error){
        return sendtscResponse(c, 500, 'VERIFY_WD', 'error', 'from', 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
}