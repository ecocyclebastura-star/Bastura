import { Context } from 'hono'
import { getLogsAdminTsc } from '../../model/admin/transaction-logs-admin'
import { sendtscResponse } from '../../logs/tsc/tsc-logs'

export const getLogsAdminTscController = async (c : Context) => {
    try {
        const payload = c.get('jwtPayload') as any;
        const admin_id = payload.sub;

        if (!payload) {
            return sendtscResponse(c, 401, 'TRANSACTION_LOGS', 'error', 'getLogsAdminTscController', 'Unauthorized', 'Unauthorized', null, 'TOKEN_INVALID');
        }

        const result = await getLogsAdminTsc(admin_id);

        if (result === 'ERR_NOT_ADMIN') {
            return sendtscResponse(c, 403, 'TRANSACTION_LOGS', 'error', 'getLogsAdminTscController', 'Unauthorized', 'Unauthorized', null, 'TOKEN_INVALID');
        }

        return sendtscResponse(c, 200, 'TRANSACTION_LOGS', 'success', 'getLogsAdminTscController', 'Logs retrieved successfully', 'Logs retrieved successfully',{data : result}, 'GET_LOGS_SUCCESS');
    } catch (error) {
        return sendtscResponse(c, 500, 'TRANSACTION_LOGS', 'error', 'getLogsAdminTscController', 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
}