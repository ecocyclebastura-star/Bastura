import { Context } from "hono"
import { getUpdateLogs } from "../../model/update/get-update"

export const getUpdateController = async (c: Context) => {
    try {
        const updateData = await getUpdateLogs()

        if (!updateData) {
            return c.json({
                status: 'error',
                message: 'Data update log tidak ditemukan (mungkin tabel masih kosong)',
                code: 'DATA_NOT_FOUND'
            }, 404)
        }

        return c.json({
            status: 'success',
            message: 'Berhasil mengambil timestamp update terbaru',
            data: updateData,
            code: 'DATA_FOUND'
        }, 200)

    } catch (error) {
        console.error(error)
        return c.json({
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        }, 500)
    }
}
