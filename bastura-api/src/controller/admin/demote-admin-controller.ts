import { Context } from "hono";
import { sendprofileResponse } from "../../logs/profile/profile-logs";
import { demoteAdminToUser } from "../../model/admin/promote-demote-admin";

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const demoteAdminController = async (c: Context) => {
    const action = "demote_admin";
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const sub = payload.sub;
        const id_user = c.req.param('id_user');

        if (!id_user || !validateUUID(id_user)) {
            return sendprofileResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID pengguna tidak valid atau tidak ditemukan.', null, 'VALIDATION_ERROR');
        }

        // Prevent superadmin from demoting themselves (although id_user wouldn't be admin role, but just in case)
        if (id_user === sub) {
            return sendprofileResponse(c, 403, action, 'error', action, 'Tidak dapat demote diri sendiri', 'Anda tidak dapat mencabut akses admin dari diri sendiri.', null, 'FORBIDDEN_SELF_DEMOTE');
        }

        const result = await demoteAdminToUser(id_user, sub);

        if (result === "USER_NOT_FOUND") {
            return sendprofileResponse(c, 404, action, 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND');
        }

        if (result === "ALREADY_USER" || result === "TARGET_IS_NOT_ADMIN") {
            return sendprofileResponse(c, 409, action, 'error', action, 'Role target bukan admin', 'Pengguna sudah berstatus warga atau bukan admin.', null, 'CONFLICT_ROLE');
        }

        return sendprofileResponse(c, 200, action, 'success', action, 'Akses admin berhasil dicabut', 'Pengguna sekarang memiliki akses sebagai warga.', { data: result }, 'DEMOTE_ADMIN_SUCCESS');
    } catch (error: any) {
        console.error("Error di demote-admin:", error);
        
        if (error.message === "ROLE_NOT_FOUND") {
            return sendprofileResponse(c, 500, action, 'error', action, 'Role tidak ditemukan di database', 'Terjadi kesalahan sistem: Role tidak valid.', null, 'INTERNAL_ERROR');
        }
        
        return sendprofileResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal memproses permintaan.', null, 'INTERNAL_SERVER_ERROR');
    }
}
