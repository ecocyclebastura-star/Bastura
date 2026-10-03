import { Context } from "hono"
import { sendAncResponse } from "../../logs/anc/anc-logs"
import { sql } from "../../model/connection"

export const getAncCategoriesController = async (c: Context) => {
    const action = "get_anc_categories"
    try {
        const result = await sql`SELECT * FROM announcement_categories`
        if (result.length === 0) {
            return sendAncResponse(c, 404, action, 'error', action, 'Data kategori tidak ditemukan', 'DATA_NOT_FOUND', undefined, 'DATA_NOT_FOUND')
        }
        return sendAncResponse(c, 200, action, 'success', action, 'Data kategori ditemukan', 'Data kategori ditemukan', result, 'DATA_FOUND')
    } catch (error) {
        console.error(error)
        return sendAncResponse(c, 500, action, 'error', action, 'Internal server error', 'INTERNAL_SERVER_ERROR')
    }
}
