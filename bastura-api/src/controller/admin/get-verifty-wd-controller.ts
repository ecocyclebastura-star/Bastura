import { Context } from "hono";
import { sendtscResponse } from "../../logs/tsc/tsc-logs";
import { getVerifyWithdrawal } from "../../model/admin/get-verift-wd";

export const getVerifyWithdrawalController = async (c : Context) => {
    try {
        const payload = c.get('jwtPayload') as any;
        const admin_id = payload.sub;

        if (!admin_id) {
            return sendtscResponse(c, 401, 'WITHDRAWAL', 'error', 'getVerifyWithdrawalController', 'Unauthorized', 'Unauthorized', null, 'TOKEN_INVALID');
        }

        const result = await getVerifyWithdrawal(admin_id);
        if (result === 'ERR_ADMIN_NOT_FOUND') {
            return sendtscResponse(c, 404, 'WITHDRAWAL', 'error', 'getVerifyWithdrawalController', 'Admin not found', 'Admin not found', null, 'ADMIN_NOT_FOUND');
        }

        if (result === 'ERR_NOT_ADMIN') {
            return sendtscResponse(c, 403, 'WITHDRAWAL', 'error', 'getVerifyWithdrawalController', 'Unauthorized', 'Unauthorized', null, 'TOKEN_INVALID');
        }

        if (result === 'ERR_WD_NOT_FOUND') {
            return sendtscResponse(c, 404, 'WITHDRAWAL', 'error', 'getVerifyWithdrawalController', 'Withdrawal not found', 'Withdrawal not found', null, 'WITHDRAWAL_NOT_FOUND');
        }

        return sendtscResponse(c, 200, 'WITHDRAWAL', 'success', 'getVerifyWithdrawalController', 'Withdrawal retrieved successfully', 'Withdrawal retrieved successfully',{data : result}, 'GET_WD_SUCCESS');
    } catch (error) {
        return sendtscResponse(c, 500, 'WITHDRAWAL', 'error', 'getVerifyWithdrawalController', 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
}
