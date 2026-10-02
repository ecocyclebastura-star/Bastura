import { Context } from "hono";
import { sendEduResponse } from "../../logs/edu/edu-logs";
import { getEducationById, editEducation } from "../../model/edu/edit-edu";
import path from "node:path";
import { sql } from "../../model/connection";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB (standar yang sama)

const checkMagicBytes = async (file: File): Promise<boolean> => {
    const arrayBuffer = await file.arrayBuffer();
    const arr = new Uint8Array(arrayBuffer).subarray(0, 4);
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    if (hex === '89504E47') return true;
    if (hex.startsWith('FFD8FF')) return true;
    return false;
}

const validateUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const uploadEduImgController = async (c: Context) => {
    const action = "upload_edu_img";
    try {
        const id = c.req.param('id') as string;
        
        if (!validateUUID(id)) {
            return sendEduResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID edukasi tidak valid.', 'VALIDATION_ERROR');
        }
        
        const body = await c.req.parseBody();
        const image = body.image;

        const existingEdu = await getEducationById(id);
        if (!existingEdu) {
            return sendEduResponse(c, 404, action, 'error', action, 'Edukasi tidak ditemukan', 'Data edukasi tidak ditemukan.', 'EDU_NOT_FOUND');
        }

        if (!image || typeof image === 'string') {
            return sendEduResponse(c, 400, action, 'error', action, 'Gambar wajib dikirim', 'Foto lampiran wajib dikirim.', 'IMAGE_REQUIRED');
        }

        const allowedMime = ['image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedMime.includes(image.type)) {
            return sendEduResponse(c, 415, action, 'error', action, 'Tipe file tidak valid (MIME)', 'Hanya file JPG dan PNG yang diperbolehkan.', 'INVALID_FILE_TYPE');
        }

        if (image.size > MAX_FILE_SIZE) {
            return sendEduResponse(c, 413, action, 'error', action, 'Ukuran file melebihi 2MB', 'Ukuran foto maksimal 2 MB.', 'FILE_TOO_LARGE');
        }

        const isValidMagic = await checkMagicBytes(image as File);
        if (!isValidMagic) {
            return sendEduResponse(c, 415, action, 'error', action, 'Magic bytes tidak valid', 'Hanya file JPG dan PNG yang diperbolehkan.', 'INVALID_FILE_TYPE');
        }

        const safeName = existingEdu.title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
        const fileExt = path.extname(image.name) || (image.type === 'image/png' ? '.png' : '.jpg');
        const createimagefilename = `edu-${safeName}-${Date.now()}${fileExt}`;
        const dirpath = path.join(import.meta.dir, '..', '..', 'img', 'edu');
        const savepath = path.join(dirpath, createimagefilename);

        const arrayBuffer = await (image as File).arrayBuffer();
        await Bun.write(savepath, arrayBuffer);

        // Update DB
        await editEducation(id, { education_img: createimagefilename });

        // Delete old image
        if (existingEdu.education_img) {
            const oldfilepath = path.join(dirpath, existingEdu.education_img);
            const oldfile = Bun.file(oldfilepath);
            if (await oldfile.exists()) {
                try {
                    await oldfile.delete();
                } catch (err) {
                    console.error(`Gagal menghapus file lama: ${existingEdu.education_img}`);
                }
            }
        }

        return sendEduResponse(c, 200, action, 'success', action, 'Foto berhasil diunggah.', 'Foto lampiran berhasil diperbarui.', null, 'UPLOAD_PHOTO_SUCCESS');
    } catch (error: any) {
        console.error("Error di upload-edu-img:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'uploadEduImgController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendEduResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal mengunggah foto', null, 'INTERNAL_SERVER_ERROR');
    }
}
