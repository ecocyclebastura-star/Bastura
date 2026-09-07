import { Context } from "hono";
import { changepass } from "../../model/profile/changepass";
import { sendprofileResponse } from "../../logs/profile/profile-logs";
import { getUser } from "../type/profile-type";

export const changepassController = async (c: Context) => {
    const action = "changepass"

    try {
        const userpayload = c.get('jwtPayload') as getUser
        if (!userpayload) {
            return sendprofileResponse(c, 401, 'CHANGE_PASSWORD', 'error', action, 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID')
        }

        const { sub } = userpayload

        const body = await c.req.json()
        const { old_password, new_password, conf_password } = body

        if (!old_password || !new_password || !conf_password) {
            return sendprofileResponse(c, 400, 'CHANGE_PASSWORD', 'error', action, 'Password lama, password baru, dan konfirmasi password wajib diisi', 'old_password, new_password, dan conf_password wajib diisi', null, 'MISSING_FIELDS')
        }

        if (new_password !== conf_password) {
            return sendprofileResponse(c, 400, 'CHANGE_PASSWORD', 'error', action, 'Password baru dan konfirmasi password tidak cocok', 'Password baru dan konfirmasi password harus sama', null, 'PASSWORD_MISMATCH')
        }

        if (old_password === new_password) {
            return sendprofileResponse(c, 400, 'CHANGE_PASSWORD', 'error', action, 'Password baru tidak boleh sama dengan password lama', 'Password baru tidak boleh sama dengan password lama', null, 'SAME_PASSWORD')
        }

        const result = await changepass(sub, old_password, new_password)

        if (result && typeof result === 'object' && 'error' in result) {
            if (result.error === 'USER_NOT_FOUND') {
                return sendprofileResponse(c, 404, 'CHANGE_PASSWORD', 'error', action, 'User tidak ditemukan', 'User tidak ditemukan atau tidak aktif', null, 'USER_NOT_FOUND')
            }
            if (result.error === 'INVALID_OLD_PASSWORD') {
                return sendprofileResponse(c, 401, 'CHANGE_PASSWORD', 'error', action, 'Password lama tidak cocok', 'Password lama yang dimasukkan tidak sesuai', null, 'INVALID_OLD_PASSWORD')
            }
        }

        return sendprofileResponse(c, 200, 'CHANGE_PASSWORD', 'success', action, 'Password berhasil diubah', 'Password berhasil diubah', { data: result }, 'CHANGE_PASSWORD_SUCCESS')

    } catch (error) {
        console.error("Error di changepass:", error)
        return sendprofileResponse(c, 500, 'CHANGE_PASSWORD', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}
