import { Context } from "hono";
import { basename  , resolve } from "path";
import { anclog, sendAncResponse } from "../../logs/anc/anc-logs";


export const getAncPhotoController = async (c: Context) => {
    const action = "get_anc_photo";
    
    try {
        
        const filename = basename(c.req.param('filename') || '') ;

        if (!filename) {
            return sendAncResponse(c, 400, action, 'error', action, 'Filename tidak diberikan', 'Filename tidak valid', 'INVALID_FILENAME');
        }

        
        const baseDir = resolve(process.cwd(), 'src', 'img', 'catalog');
        const imagePath = resolve(baseDir, filename);

        if (!imagePath.startsWith(baseDir)) {
            return sendAncResponse(c, 403, action, 'error', action, 'Akses file ditolak', 'Path tidak valid', 'FORBIDDEN_PATH');
        }

        const file = Bun.file(imagePath);

        const exists = await file.exists();

        if (!exists) {
            return sendAncResponse(c, 404, action, 'error', action, `File tidak ditemukan: ${filename}`, 'Foto tidak ditemukan', 'FILE_NOT_FOUND');
        }

        
        await anclog({
            message: `Berhasil mengambil foto: ${filename}`,
            status: 'success',
            procces: action,
            anc_type: action,
            timestamp: new Date()
        });

        
        return new Response(file);

    } catch (error) {
        console.error(error);
        return sendAncResponse(c, 500, action, 'error', action, 'Internal server error', 'INTERNAL_SERVER_ERROR');
    }
}
