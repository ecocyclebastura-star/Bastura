import { Context } from "hono";
import { sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";
import { getWasteCategoriesModel } from "../../model/catalog/get-categories";

export const getCategoriesController = async (c: Context) => {
    const action = "get_categories";
    try {
        const result = await getWasteCategoriesModel();
        return sendcatalogResponse(c, 200, action, 'success', action, 'Berhasil mengambil daftar kategori', 'Berhasil mengambil daftar kategori', { data: result }, 'GET_CATEGORIES_SUCCESS');
    } catch (error: any) {
        console.error("Error di get-categories:", error);
        return sendcatalogResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
}
