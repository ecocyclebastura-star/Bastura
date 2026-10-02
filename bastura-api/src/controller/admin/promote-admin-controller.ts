import { Context } from "hono";
import { sendprofileResponse } from "../../logs/profile/profile-logs";
import { promoteUserToAdmin } from "../../model/admin/promote-demote-admin";

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const promoteAdminController = async (c: Context) => {
    const action = "promote_admin";
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const sub = payload.sub;
        const id_user = c.req.param('id_user');

        if (!id_user || !validateUUID(id_user)) {
            return sendprofileResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID pengguna tidak valid atau tidak ditemukan.', null, 'VALIDATION_ERROR');
        }

        const result = await promoteUserToAdmin(id_user, sub);

        if (result === "USER_NOT_FOUND") {
            return sendprofileResponse(c, 404, action, 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND');
        }

        if (result === "ALREADY_ADMIN" || result === "TARGET_IS_NOT_USER") {
            return sendprofileResponse(c, 409, action, 'error', action, 'Role target bukan user', 'Pengguna sudah menjadi admin atau tidak memiliki role warga.', null, 'CONFLICT_ROLE');
        }

        if (result === "USER_BLOCKED") {
            return sendprofileResponse(c, 409, action, 'error', action, 'User sedang diblokir', 'Pengguna yang sedang diblokir tidak dapat dijadikan admin.', null, 'USER_BLOCKED');
        }

        return sendprofileResponse(c, 200, action, 'success', action, 'User berhasil dijadikan admin', 'Pengguna sekarang memiliki akses sebagai admin.', { data: result }, 'PROMOTE_ADMIN_SUCCESS');
    } catch (error: any) {
        console.error("Error di promote-admin:", error);
        
        if (error.message === "ROLE_NOT_FOUND") {
            return sendprofileResponse(c, 500, action, 'error', action, 'Role tidak ditemukan di database', 'Terjadi kesalahan sistem: Role tidak valid.', null, 'INTERNAL_ERROR');
        }
        
        return sendprofileResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal memproses permintaan.', null, 'INTERNAL_SERVER_ERROR');
    }
}
