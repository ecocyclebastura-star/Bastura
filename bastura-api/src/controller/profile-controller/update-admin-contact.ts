import { Context } from "hono";
import { sendprofileResponse } from "../../logs/profile/profile-logs";
import { updateAdminContactModel } from "../../model/profile/update-admin-contact";

export const updateAdminContactController = async (c: Context) => {
    const action = "update_admin_contact";

    try {
        const body = await c.req.json();
        const { phone } = body;

        if (!phone) {
            return sendprofileResponse(c, 400, 'UPDATE_ADMIN_CONTACT', 'error', action, 'Phone number is required', 'Nomor telepon (phone) wajib diisi', null, 'BAD_REQUEST');
        }

        const result = await updateAdminContactModel(phone);
        
        if (!result || result.length === 0) {
            return sendprofileResponse(c, 404, 'UPDATE_ADMIN_CONTACT', 'error', action, 'Admin contact tidak ditemukan', 'Admin contact tidak ditemukan', null, 'ADMIN_CONTACT_NOT_FOUND');
        }
        
        return sendprofileResponse(c, 200, 'UPDATE_ADMIN_CONTACT', 'success', action, 'Admin contact berhasil diubah', 'Nomor Admin/CS berhasil diubah', { data: result }, 'UPDATE_ADMIN_CONTACT_SUCCESS');
    } catch (error) {
        console.error("Error di update-admin-contact:", error);
        return sendprofileResponse(c, 500, 'UPDATE_ADMIN_CONTACT', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
};
