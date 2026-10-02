import { Context } from "hono";
import { sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";
import { getWasteCatalogById, editWasteCatalog } from "../../model/catalog/edit-catalog";
import { checkWasteCatalogName, checkWasteCategoryExists } from "../../model/catalog/add-catalog";
import { sql } from "../../model/connection";

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const editCatalogController = async (c: Context) => {
    const action = "edit_catalog";
    try {
        const id = c.req.param('id') as string;
        
        if (!validateUUID(id)) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID jenis sampah tidak valid.', 'VALIDATION_ERROR');
        }

        const body = await c.req.json();

        const existingCatalog = await getWasteCatalogById(id);
        if (!existingCatalog) {
            return sendcatalogResponse(c, 404, action, 'error', action, 'Katalog tidak ditemukan', 'Data jenis sampah tidak ditemukan.', 'CATALOG_NOT_FOUND');
        }

        const updateData: any = {};

        if (body.name !== undefined) {
            const name = (body.name as string).trim();
            if (name.length === 0 || name.length > 100) {
                return sendcatalogResponse(c, 400, action, 'error', action, 'Nama tidak valid', 'Nama sampah tidak boleh kosong dan maksimal 100 karakter.', 'INVALID_NAME');
            }
            const nameExists = await checkWasteCatalogName(name, id);
            if (nameExists) {
                return sendcatalogResponse(c, 400, action, 'error', action, 'Nama jenis sampah sudah ada', 'Nama jenis sampah sudah digunakan.', 'NAME_ALREADY_EXISTS');
            }
            updateData.name = name;
        }

        if (body.category_id !== undefined) {
            const category_id = parseInt(body.category_id, 10);
            if (isNaN(category_id)) {
                return sendcatalogResponse(c, 400, action, 'error', action, 'Category ID tidak valid', 'ID kategori wajib berupa angka.', 'INVALID_CATEGORY');
            }
            const categoryExists = await checkWasteCategoryExists(category_id);
            if (!categoryExists) {
                return sendcatalogResponse(c, 400, action, 'error', action, 'Kategori tidak ditemukan', 'Kategori sampah tidak ditemukan.', 'CATEGORY_NOT_FOUND');
            }
            updateData.category_id = category_id;
        }

        if (body.price !== undefined) {
            const price = parseInt(body.price, 10);
            if (isNaN(price) || price < 0) {
                return sendcatalogResponse(c, 400, action, 'error', action, 'Harga tidak valid', 'Estimasi harga wajib berupa angka non-negatif.', 'INVALID_PRICE');
            }
            updateData.price = price;
        }

        if (body.description !== undefined) {
            updateData.description = body.description as string;
        }

        if (Object.keys(updateData).length > 0) {
            await editWasteCatalog(id, updateData);
        }

        return sendcatalogResponse(c, 200, action, 'success', action, 'Berhasil mengedit jenis sampah.', 'Berhasil mengedit jenis sampah.', null, 'EDIT_CATALOG_SUCCESS');
    } catch (error: any) {
        console.error("Error di edit-catalog:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'editCatalogController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendcatalogResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal mengedit jenis sampah', null, 'INTERNAL_SERVER_ERROR');
    }
}
