import { Context } from "hono";
import { sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";
import { addWasteCatalog, getWasteCatalogByName, checkWasteCategoryExists } from "../../model/catalog/add-catalog";
import { sql } from "../../model/connection";

export const addCatalogController = async (c: Context) => {
    const action = "add_catalog";
    try {
        const body = await c.req.json();
        const name = (body.name as string)?.trim();
        const category_id = parseInt(body.category_id, 10);
        const price = parseInt(body.price, 10);
        const description = (body.description as string) || '';

        if (!name || name.length === 0 || name.length > 100) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'Nama tidak valid', 'Nama sampah wajib diisi dan maksimal 100 karakter.', 'INVALID_NAME');
        }

        if (isNaN(category_id)) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'Category ID tidak valid', 'ID kategori wajib berupa angka.', 'INVALID_CATEGORY');
        }

        if (isNaN(price) || price < 0) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'Harga tidak valid', 'Estimasi harga wajib berupa angka non-negatif.', 'INVALID_PRICE');
        }

        // Check if category exists
        const categoryExists = await checkWasteCategoryExists(category_id);
        if (!categoryExists) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'Kategori tidak ditemukan', 'Kategori sampah tidak ditemukan di sistem.', 'CATEGORY_NOT_FOUND');
        }

        // Check if name exists (deleted or active)
        const existingCatalog = await getWasteCatalogByName(name);
        
        let resultId = null;

        if (existingCatalog) {
            if (existingCatalog.deleted_at === null) {
                return sendcatalogResponse(c, 400, action, 'error', action, 'Nama jenis sampah sudah ada', 'Nama jenis sampah sudah digunakan dan masih aktif.', 'NAME_ALREADY_EXISTS');
            } else {
                // It exists but was soft-deleted, so we restore it and update with new details
                await sql`
                    UPDATE waste_catalog 
                    SET deleted_at = NULL,
                        category_id = ${category_id},
                        price = ${price},
                        description = ${description},
                        updated_at = NOW()
                    WHERE id_waste = ${existingCatalog.id_waste}
                `;
                resultId = existingCatalog.id_waste;
            }
        } else {
            // Truly does not exist, insert new
            const result = await addWasteCatalog(name, category_id, 'kg', price, description, null);
            resultId = result.id_waste;
        }

        return sendcatalogResponse(c, 201, action, 'success', action, 'Jenis sampah berhasil ditambahkan ke daftar.', 'Jenis sampah berhasil ditambahkan ke daftar.', { id_waste: resultId }, 'ADD_CATALOG_SUCCESS');
    } catch (error: any) {
        console.error("Error di add-catalog:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'addCatalogController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendcatalogResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menambahkan jenis sampah', null, 'INTERNAL_SERVER_ERROR');
    }
}
