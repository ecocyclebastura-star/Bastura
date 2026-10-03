import { Context } from "hono";
import { sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";
import { getWasteCatalogById, editWasteCatalog } from "../../model/catalog/edit-catalog";
import path from "node:path";
import { sql } from "../../model/connection";
import { validateUUID } from "../../utils/validation";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const checkMagicBytes = async (file: File): Promise<boolean> => {
    const arrayBuffer = await file.arrayBuffer();
    const arr = new Uint8Array(arrayBuffer).subarray(0, 4);
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    if (hex === '89504E47') return true;
    if (hex.startsWith('FFD8FF')) return true;
    return false;
}



export const uploadCatalogImgController = async (c: Context) => {
    const action = "upload_catalog_img";
    try {
        const id = c.req.param('id') as string;

        if (!validateUUID(id)) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID jenis sampah tidak valid.', 'VALIDATION_ERROR');
        }
        const body = await c.req.parseBody();
        const image = body.image;

        const existingCatalog = await getWasteCatalogById(id);
        if (!existingCatalog) {
            return sendcatalogResponse(c, 404, action, 'error', action, 'Katalog tidak ditemukan', 'Data jenis sampah tidak ditemukan.', 'CATALOG_NOT_FOUND');
        }

        if (!image || typeof image === 'string') {
            return sendcatalogResponse(c, 400, action, 'error', action, 'Gambar wajib dikirim', 'Foto lampiran wajib dikirim.', 'IMAGE_REQUIRED');
        }

        const allowedMime = ['image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedMime.includes(image.type)) {
            return sendcatalogResponse(c, 415, action, 'error', action, 'Tipe file tidak valid (MIME)', 'Hanya file JPG dan PNG yang diperbolehkan.', 'INVALID_FILE_TYPE');
        }

        if (image.size > MAX_FILE_SIZE) {
            return sendcatalogResponse(c, 413, action, 'error', action, 'Ukuran file melebihi 5MB', 'Ukuran foto maksimal 5 MB.', 'FILE_TOO_LARGE');
        }

        const isValidMagic = await checkMagicBytes(image as File);
        if (!isValidMagic) {
            return sendcatalogResponse(c, 415, action, 'error', action, 'Magic bytes tidak valid', 'Hanya file JPG dan PNG yang diperbolehkan.', 'INVALID_FILE_TYPE');
        }

        const safeName = existingCatalog.name.replace(/[^a-zA-Z0-9]/g, '');
        const fileExt = path.extname(image.name) || (image.type === 'image/png' ? '.png' : '.jpg');
        const createimagefilename = `catalog-${safeName}-${Date.now()}${fileExt}`;
        const dirpath = path.join(import.meta.dir, '..', '..', 'img', 'catalog');
        const savepath = path.join(dirpath, createimagefilename);

        const arrayBuffer = await (image as File).arrayBuffer();
        await Bun.write(savepath, arrayBuffer);

        // Update DB
        await editWasteCatalog(id, { catalog_img: createimagefilename });

        // Delete old image
        if (existingCatalog.catalog_img) {
            const oldfilepath = path.join(dirpath, existingCatalog.catalog_img);
            const oldfile = Bun.file(oldfilepath);
            if (await oldfile.exists()) {
                try {
                    await oldfile.delete();
                } catch (err) {
                    console.error(`Gagal menghapus file lama: ${existingCatalog.catalog_img}`);
                }
            }
        }

        return sendcatalogResponse(c, 200, action, 'success', action, 'Foto berhasil diunggah.', 'Foto jenis sampah berhasil diperbarui.', null, 'UPLOAD_PHOTO_SUCCESS');
    } catch (error: any) {
        console.error("Error di upload-catalog-img:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'uploadCatalogImgController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendcatalogResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal mengunggah foto', null, 'INTERNAL_SERVER_ERROR');
    }
}
