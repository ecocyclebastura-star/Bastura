import { Context } from "hono";
import { getCatalogModel } from "../../model/catalog/get-catalog";
import { sendprofileResponse } from "../../logs/profile/profile-logs";

export const getCatalogController = async (c : Context) => {
    const action = "get_catalog"
    try {
        const payload = c.get('jwtPayload') as { sub : string };
        const sub = payload.sub;

        if (!sub) {
            return sendprofileResponse(c, 400, 'GET_CATALOG', 'error', action, 'ID tidak ditemukan', 'ID tidak ditemukan', null, 'ID_NOT_FOUND')
        }

        const result = await getCatalogModel(sub)

        if (result === "USER_NOT_FOUND") {
            return sendprofileResponse(c, 404, 'GET_CATALOG', 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        }

        return sendprofileResponse(c, 200, 'GET_CATALOG', 'success', action, 'Catalog berhasil ditemukan', 'Catalog berhasil ditemukan', { data: result }, 'GET_CATALOG_SUCCESS')
    } catch (error) {
        console.error("Error di get-catalog:", error);
        return sendprofileResponse(c, 500, 'GET_CATALOG', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}
