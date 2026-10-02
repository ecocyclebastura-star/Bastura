import { Context } from "hono";
import { sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";
import { getWasteCatalogById } from "../../model/catalog/edit-catalog";
import { deleteWasteCatalog } from "../../model/catalog/delete-catalog";
import { sql } from "../../model/connection";

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const deleteCatalogController = async (c: Context) => {
    const action = "delete_catalog";
    try {
        const id = c.req.param('id');
        
        if (!id || !validateUUID(id)) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'ID tidak valid', 'Parameter ID tidak valid.', 'INVALID_PARAM');
        }

        const existingCatalog = await getWasteCatalogById(id);
        if (!existingCatalog) {
            return sendcatalogResponse(c, 404, action, 'error', action, 'Katalog tidak ditemukan', 'Data jenis sampah tidak ditemukan.', 'CATALOG_NOT_FOUND');
        }

        await deleteWasteCatalog(id);

        return sendcatalogResponse(c, 200, action, 'success', action, 'Berhasil menghapus jenis sampah.', 'Berhasil menghapus jenis sampah.', null, 'DELETE_CATALOG_SUCCESS');
    } catch (error: any) {
        console.error("Error di delete-catalog:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'deleteCatalogController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendcatalogResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menghapus jenis sampah', null, 'INTERNAL_SERVER_ERROR');
    }
}
