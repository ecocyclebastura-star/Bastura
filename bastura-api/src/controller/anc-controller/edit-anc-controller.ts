import { Context } from "hono"
import { sendAncResponse } from "../../logs/anc/anc-logs"
import { getAncById } from "../../model/anc/get-announcements"
import { editAnc } from "../../model/anc/edit-delete-anc"
import { checkCategoryExists } from "../../model/anc/add-anc"
import { sql } from "../../model/connection"
import path from "node:path"
import { validateUUID } from "../../utils/validation";

const FILE_LIMIT = 2 * 1024 * 1024 + 102400;

const checkMagicBytes = async (file: File): Promise<boolean> => {
    const arrayBuffer = await file.arrayBuffer();
    const arr = new Uint8Array(arrayBuffer).subarray(0, 4);
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    if (hex === '89504E47') return true;
    if (hex.startsWith('FFD8FF')) return true;
    return false;
}



export const editAncController = async (c: Context) => {
    const action = "edit_anc";
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const authorId = payload?.sub;

        if (!authorId) {
            return sendAncResponse(c, 401, action, 'error', action, 'Unauthorized', 'Gagal memverifikasi user.', undefined, 'UNAUTHORIZED');
        }

        const id = c.req.param('id') || '';
        if (!id || !validateUUID(id)) {
            return sendAncResponse(c, 400, action, 'error', action, 'ID tidak valid', 'ID pengumuman tidak valid.', undefined, 'VALIDATION_ERROR');
        }

        const existingAnc = await getAncById(id);
        if (!existingAnc) {
            return sendAncResponse(c, 404, action, 'error', action, 'Pengumuman tidak ditemukan', 'Pengumuman tidak ditemukan.', undefined, 'NOT_FOUND');
        }

        const body = await c.req.parseBody();
        const titleRaw = body.title;
        const contentRaw = body.content;
        const categoryIdRaw = body.category_id;
        const image = body.image;

        const updateData: any = {};
        const errors: string[] = [];

        if (titleRaw !== undefined) {
            if (typeof titleRaw !== 'string' || titleRaw.trim().length === 0 || titleRaw.trim().length > 150) {
                errors.push('Judul harus berupa teks dan maksimal 150 karakter.');
            } else {
                updateData.title = titleRaw.trim();
            }
        }

        if (categoryIdRaw !== undefined) {
            if (typeof categoryIdRaw !== 'string' || !validateUUID(categoryIdRaw)) {
                errors.push('Kategori ID harus berupa UUID yang valid.');
            } else {
                const categoryExists = await checkCategoryExists(categoryIdRaw);
                if (!categoryExists) {
                    errors.push('Kategori pengumuman tidak ditemukan di database.');
                } else {
                    updateData.category_id = categoryIdRaw;
                }
            }
        }

        if (contentRaw !== undefined) {
            if (typeof contentRaw !== 'string' || contentRaw.trim().length === 0 || contentRaw.trim().length > 10000) {
                errors.push('Isi pengumuman harus berupa teks dan maksimal 10.000 karakter.');
            } else {
                // preserve author_id
                const oldAuthorId = existingAnc.author_id;
                updateData.content = { text: contentRaw.trim(), author_id: oldAuthorId };
            }
        }

        if (errors.length > 0) {
            return sendAncResponse(c, 400, action, 'error', action, 'Validasi gagal', errors.join(' '), undefined, 'VALIDATION_ERROR');
        }

        let createimagefilename = undefined;
        let imageArrayBuffer: ArrayBuffer | null = null;
        if (image) {
            if (typeof image === 'string') {
                return sendAncResponse(c, 400, action, 'error', action, 'Format file tidak valid', 'Field image harus berupa file.', undefined, 'VALIDATION_ERROR');
            }
            const allowedMime = ['image/png', 'image/jpg', 'image/jpeg'];
            if (!allowedMime.includes(image.type)) {
                return sendAncResponse(c, 415, action, 'error', action, 'Tipe file tidak valid (MIME)', 'Hanya file JPG dan PNG yang diperbolehkan.', undefined, 'INVALID_FILE_TYPE');
            }
            if (image.size > FILE_LIMIT) {
                return sendAncResponse(c, 413, action, 'error', action, 'Ukuran file melebihi 2MB', 'Ukuran foto maksimal 2 MB.', undefined, 'FILE_TOO_LARGE');
            }
            const isValidMagic = await checkMagicBytes(image as File);
            if (!isValidMagic) {
                return sendAncResponse(c, 415, action, 'error', action, 'Magic bytes tidak valid', 'Hanya file JPG dan PNG yang diperbolehkan.', undefined, 'INVALID_FILE_TYPE');
            }
            const activeTitle = updateData.title || existingAnc.title;
            const safeName = activeTitle.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
            const fileExt = path.extname(image.name) || (image.type === 'image/png' ? '.png' : '.jpg');
            createimagefilename = `anc-${safeName}-${Date.now()}${fileExt}`;
            imageArrayBuffer = await (image as File).arrayBuffer();
            updateData.announcements_img = createimagefilename;
        }

        if (Object.keys(updateData).length > 0) {
            await editAnc(id, updateData);
            await sql`INSERT INTO audit_logs (actor_id, target_id, action_type, created_at) VALUES (${authorId}, ${id}, 'EDIT_ANC', NOW())`;
        }

        if (createimagefilename && imageArrayBuffer) {
            const dirpath = path.join(import.meta.dir, '..', '..', 'img', 'anc');
            const savepath = path.join(dirpath, createimagefilename);
            try {
                await Bun.write(savepath, imageArrayBuffer);
                // delete old image
                if (existingAnc.announcements_img) {
                    const oldfilepath = path.join(dirpath, existingAnc.announcements_img);
                    const oldfile = Bun.file(oldfilepath);
                    if (await oldfile.exists()) {
                        await oldfile.delete();
                    }
                }
            } catch (err) {
                console.error("Gagal menyimpan file gambar atau menghapus yang lama:", err);
            }
        }

        return sendAncResponse(c, 200, action, 'success', action, 'Berhasil mengedit pengumuman.', 'Berhasil mengedit pengumuman.', undefined, 'EDIT_ANC_SUCCESS');
    } catch (error: any) {
        console.error("Error di edit-anc:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'editAncController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendAncResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal mengedit pengumuman', undefined, 'INTERNAL_SERVER_ERROR');
    }
}
