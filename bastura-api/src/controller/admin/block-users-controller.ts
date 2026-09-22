import { Context } from "hono"
import { sendprofileResponse } from "../../logs/profile/profile-logs"
import { blockUser } from "../../model/admin/block-users"

export const blockUserController = async (c: Context) => {
    const action = "block_user"
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const sub = payload.sub;
        const id_user = c.req.param('id_user');

        if (!sub || !id_user) {
            return sendprofileResponse(c, 400, 'GET_CATALOG', 'error', action, 'ID tidak ditemukan', 'ID tidak ditemukan', null, 'ID_NOT_FOUND')
        }

        const result = await blockUser(id_user, sub)

        if (result === "ACCESS_DENIED_UR_NOT_ADMIN") {
            return sendprofileResponse(c, 403, 'GET_CATALOG', 'error', action, 'Akses ditolak', 'Akses ditolak', null, 'ACCESS_DENIED_UR_NOT_ADMIN')
        }

        if (result.length === 0) {
            return sendprofileResponse(c, 404, 'GET_CATALOG', 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        }
        
        return sendprofileResponse(c, 200, 'GET_CATALOG', 'success', action, 'User berhasil diblokir', 'User berhasil diblokir', { data: result }, 'GET_CATALOG_SUCCESS')
    } catch (error) {
        console.error("Error di get-catalog:", error);
        return sendprofileResponse(c, 500, 'GET_CATALOG', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}