import { Context } from "hono";
import { sendprofileResponse } from "../../logs/profile/profile-logs";
import { getAdminContactModel } from "../../model/profile/get-admin-contact";

export const getAdminContactController = async (c : Context) => {
    const action = "get_admin_contact"

    try {
        const result = await getAdminContactModel()
        if(!result || result.length === 0) {
            return sendprofileResponse(c, 404, 'GET_ADMIN_CONTACT', 'error', action, 'Admin contact tidak ditemukan', 'Admin contact tidak ditemukan', null, 'ADMIN_CONTACT_NOT_FOUND')
        }
        return sendprofileResponse(c, 200, 'GET_ADMIN_CONTACT', 'success', action, 'Admin contact berhasil ditemukan', 'Admin contact berhasil ditemukan', {data : result}, 'GET_ADMIN_CONTACT_SUCCESS')
    } catch (error) {
        console.error("Error di get-admin-contact:", error);
        return sendprofileResponse(c, 500, 'GET_ADMIN_CONTACT', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}
