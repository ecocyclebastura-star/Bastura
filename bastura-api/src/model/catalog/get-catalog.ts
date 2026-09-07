import { sql } from "../connection";

export const getCatalogModel = async (id: string) => {
    try {
        const check_user = await sql`SELECT role_id FROM users WHERE id_users = ${id ?? null}`

        if (check_user.length === 0) {
            return "USER_NOT_FOUND"
        }
        const result = await sql`SELECT * FROM waste_catalog`
        return result
    } catch (error) {
        console.error('Error getting catalog from database!', error)
        throw error
    }
}