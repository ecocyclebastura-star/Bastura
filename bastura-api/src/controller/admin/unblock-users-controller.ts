import { Context } from "hono";
import { unblockUser } from "../../model/admin/unblock-users";
import { sendAuthResponse } from "../../logs/auth/auth-logs";

export const unblockUserController = async (c : Context) => {
    try {
        const payload = c.get('jwtPayload') as any;
        const id_admin = payload.sub;
        const id_user = c.req.param('id_user');

        if (!payload) {
            return sendAuthResponse(c, 401, 'error', 'unblock_user', 'Unauthorized: Token tidak valid', 'Unauthorized: Token tidak valid', null, 'ERR_UNAUTHORIZED');
        }

        if (!id_user) {
            return sendAuthResponse(c, 400, 'error', 'unblock_user', 'User ID is required', 'User ID is required', null, 'ERR_MISSING_USER_ID');
        }

        const result = await unblockUser(id_user, id_admin);

        if (result === "ACCESS_DENIED_UR_NOT_ADMIN") {
            return sendAuthResponse(c, 403, 'error', 'unblock_user', 'Access denied: You are not an admin', 'Access denied: You are not an admin', null, 'ERR_ACCESS_DENIED');
        }

        if (result === "USER_NOT_FOUND") {
            return sendAuthResponse(c, 404, 'error', 'unblock_user', 'User not found', 'User not found', null, 'ERR_USER_NOT_FOUND');
        }

        return sendAuthResponse(c, 200, 'success', 'unblock_user', 'User unblocked successfully', 'User unblocked successfully', {data : result}, 'SUCC_USER_UNBLOCKED');
    } catch (error) {
        return sendAuthResponse(c, 500, 'error', 'unblock_user', 'Failed to unblock user', 'Failed to unblock user', error, 'ERR_UNBLOCK_USER');
    }
}