import { Context } from "hono";
import { basename  , resolve } from "path";
import { cataloglog, sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";


export const getCatalogPhotoController = async (c: Context) => {
    const action = "get_catalog_photo";

    try {

        const filename = basename(c.req.param('filename') || '') ;

        if (!filename) {
            return sendcatalogResponse(c, 400, action, 'error', action, 'Filename tidak diberikan', 'Filename tidak valid', 'INVALID_FILENAME');
        }

        
        const baseDir = resolve(process.cwd(), 'src', 'img', 'catalog');
        const imagePath = resolve(baseDir, filename);

        if (!imagePath.startsWith(baseDir)) {
            return sendcatalogResponse(c, 403, action, 'error', action, 'Akses file ditolak', 'Path tidak valid', 'FORBIDDEN_PATH');
        }

        const file = Bun.file(imagePath);

        const exists = await file.exists();

        if (!exists) {
            return sendcatalogResponse(c, 404, action, 'error', action, `File tidak ditemukan: ${filename}`, 'Foto tidak ditemukan', 'FILE_NOT_FOUND');
        }

        
        await cataloglog({
            message: `Berhasil mengambil foto: ${filename}`,
            status: 'success',
            procces: action,
            catalog_type: action,
            timestamp: new Date()
        });

        
        return new Response(file);

    } catch (error) {
        console.error(error);
        return sendcatalogResponse(c, 500, action, 'error', action, 'Internal server error', 'INTERNAL_SERVER_ERROR');
    }
}
