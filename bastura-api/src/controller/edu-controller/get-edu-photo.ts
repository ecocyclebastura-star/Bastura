import { Context } from "hono";
import { basename, resolve } from "path";
import { edulog, sendEduResponse } from "../../logs/edu/edu-logs";

export const getEduPhotoController = async (c: Context) => {
    const action = "get_edu_photo";
    
    try {
        const rawFilename = c.req.param('filename');

        if (!rawFilename) {
            return sendEduResponse(c, 400, action, 'error', action, 'Filename tidak diberikan', 'Filename tidak valid', undefined, 'INVALID_FILENAME');
        }

        const safeFilename = basename(rawFilename);
        const baseDir = resolve(process.cwd(), 'src', 'img', 'edu');
        const imagePath = resolve(baseDir, safeFilename);

        if (!imagePath.startsWith(baseDir)) {
            return sendEduResponse(c, 403, action, 'error', action, 'Akses file ditolak', 'Path tidak valid', undefined, 'FORBIDDEN_PATH');
        }

        const file = Bun.file(imagePath);
        const exists = await file.exists();

        if (!exists) {
            return sendEduResponse(c, 404, action, 'error', action, `File tidak ditemukan: ${safeFilename}`, 'Foto tidak ditemukan', undefined, 'FILE_NOT_FOUND');
        }

        await edulog({
            message: `Berhasil mengambil foto: ${safeFilename}`,
            status: 'success',
            procces: action,
            edu_type: action,
            timestamp: new Date()
        });

        return new Response(file);

    } catch (error) {
        console.error(error);
        return sendEduResponse(c, 500, action, 'error', action, 'Internal server error', 'Internal server error', undefined, 'INTERNAL_SERVER_ERROR');
    }
}
