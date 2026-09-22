import { Context} from "hono";
import { sendtscResponse } from "../../logs/tsc/tsc-logs";
import { getTransactionLogs } from "../../model/tsc/transaction-log";


export const getTransactionLogsUserController = async (c : Context) => {
    try {
        const payload = c.get('jwtPayload') as any;
        const user_id = (await c.req.json()).user_id;
        const admin_id = payload.sub;

        if (!admin_id || !user_id ) {
            return sendtscResponse(c, 401, 'TRANSACTION_LOGS', 'error', 'getTransactionLogsUserController', 'Unauthorized', 'Unauthorized', null, 'TOKEN_INVALID');
        }

        const result = await getTransactionLogs(user_id);

        if (!result) {
            return sendtscResponse(c, 404, 'TRANSACTION_LOGS', 'error', 'getTransactionLogsUserController', 'User not found', 'User not found', null, 'USER_NOT_FOUND');
        }

        return sendtscResponse(c, 200, 'TRANSACTION_LOGS', 'success', 'getTransactionLogsUserController', 'Logs retrieved successfully', 'Logs retrieved successfully',{data : result}, 'GET_LOGS_SUCCESS');
    } catch (error) {
        return sendtscResponse(c, 500, 'TRANSACTION_LOGS', 'error', 'getTransactionLogsUserController', 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
}
