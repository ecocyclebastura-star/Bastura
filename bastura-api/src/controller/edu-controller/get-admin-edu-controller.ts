import { Context } from "hono";
import { sendEduResponse } from "../../logs/edu/edu-logs";
import { getAdminEduList, getAdminEduById } from "../../model/edu/get-admin-edu";

export const getAdminEduController = async (c: Context) => {
    const action = "get_admin_edu";
    try {
        const id = c.req.query('id');

        if (id) {
            const result = await getAdminEduById(id);
            if (!result) {
                return sendEduResponse(c, 404, action, 'error', action, 'Edukasi tidak ditemukan', 'Data edukasi tidak ditemukan.', 'EDU_NOT_FOUND');
            }
            return sendEduResponse(c, 200, action, 'success', action, 'Edukasi berhasil ditemukan', 'Edukasi berhasil ditemukan', { data: result }, 'GET_EDU_SUCCESS');
        }

        const result = await getAdminEduList();
        return sendEduResponse(c, 200, action, 'success', action, 'Daftar edukasi berhasil ditemukan', 'Daftar edukasi berhasil ditemukan', { data: result }, 'GET_EDU_LIST_SUCCESS');
    } catch (error) {
        console.error("Error di get-admin-edu:", error);
        return sendEduResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
}
