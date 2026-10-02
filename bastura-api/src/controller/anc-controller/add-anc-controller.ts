import { Context } from "hono"
import { sendAncResponse } from "../../logs/anc/anc-logs"
import { addAnc, checkCategoryExists } from "../../model/anc/add-anc"
import { sql } from "../../model/connection"
import path from "node:path"

const MAX_FILE_SIZE = 2097152; // 2MB + a little bit of overhead? No, just use 2MB since instruction says "batasnya sedikit di atas 2 MB agar overhead multipart tidak menolak file 2 MB yang valid". So 2 * 1024 * 1024 + 102400 (2.1 MB).
const FILE_LIMIT = 2 * 1024 * 1024 + 102400;

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

export const addAncController = async (c: Context) => {
    const action = "add_anc";
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const authorId = payload?.sub;

        if (!authorId) {
            return sendAncResponse(c, 401, action, 'error', action, 'Unauthorized', 'Gagal memverifikasi user.', undefined, 'UNAUTHORIZED');
        }

        const body = await c.req.parseBody();
        const titleRaw = body.title;
        const contentRaw = body.content;
        const categoryIdRaw = body.category_id;
        const image = body.image;

        // Validation
        const errors: string[] = [];

        if (typeof titleRaw !== 'string' || titleRaw.trim().length === 0 || titleRaw.trim().length > 150) {
            errors.push('Judul wajib diisi, berupa teks, dan maksimal 150 karakter.');
        }

        if (typeof contentRaw !== 'string' || contentRaw.trim().length === 0 || contentRaw.trim().length > 10000) {
            errors.push('Isi pengumuman wajib diisi, berupa teks, dan maksimal 10.000 karakter.');
        }

        if (typeof categoryIdRaw !== 'string' || !validateUUID(categoryIdRaw)) {
            errors.push('Kategori ID wajib diisi dan harus berupa UUID yang valid.');
        }

        if (errors.length > 0) {
            return sendAncResponse(c, 400, action, 'error', action, 'Validasi gagal', errors.join(' '), undefined, 'VALIDATION_ERROR');
        }

        const title = (titleRaw as string).trim();
        const contentStr = (contentRaw as string).trim();
        const category_id = categoryIdRaw as string;

        // Check if category exists in DB
        const categoryExists = await checkCategoryExists(category_id);
        if (!categoryExists) {
            return sendAncResponse(c, 400, action, 'error', action, 'Kategori tidak valid', 'Kategori pengumuman tidak ditemukan di database.', undefined, 'VALIDATION_ERROR');
        }

        // Validate image if present
        let createimagefilename = null;
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

            const safeName = title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
            const fileExt = path.extname(image.name) || (image.type === 'image/png' ? '.png' : '.jpg');
            createimagefilename = `anc-${safeName}-${Date.now()}${fileExt}`;
            imageArrayBuffer = await (image as File).arrayBuffer();
        }

        // Store to DB
        // Embed author_id to maintain reference to the admin who created it
        const contentJson = { text: contentStr, author_id: authorId };

        let resultId: string | null = null;
        try {
            const result = await addAnc(title, category_id, contentJson, createimagefilename);
            resultId = result.id_announcements;

            // Audit Log
            await sql`INSERT INTO audit_logs (actor_id, target_id, action_type, created_at) VALUES (${authorId}, ${resultId}, 'ADD_ANC', NOW())`;
        } catch (dbError) {
            throw dbError; // caught by outer try-catch
        }

        // Write file only after DB insert success
        if (createimagefilename && imageArrayBuffer) {
            const dirpath = path.join(import.meta.dir, '..', '..', 'img', 'anc');
            const savepath = path.join(dirpath, createimagefilename);
            try {
                await Bun.write(savepath, imageArrayBuffer);
            } catch (err) {
                console.error("Gagal menyimpan file gambar:", err);
            }
        }

        return sendAncResponse(c, 201, action, 'success', action, 'Berhasil menambahkan pengumuman.', 'Pengumuman berhasil ditambahkan.', { id_announcements: resultId }, 'ADD_ANC_SUCCESS');
    } catch (error: any) {
        console.error("Error di add-anc:", error);
        try {
            await sql`INSERT INTO error_logs (error_message, error_level, source, error_at) VALUES (${error.message}, 'ERROR', 'addAncController', NOW())`;
        } catch (e) {
            console.error("Gagal menulis error log", e);
        }
        return sendAncResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Gagal menambahkan pengumuman', undefined, 'INTERNAL_SERVER_ERROR');
    }
}
