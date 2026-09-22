import { sql } from "../connection";

export const getCatalogModel = async (id: string) => {
    try {
        const check_user = await sql`SELECT role_id FROM users WHERE id_users = ${id ?? null}`

        if (check_user.length === 0) {
            return "USER_NOT_FOUND"
        }
        const result = await sql`SELECT w.* , c.category_name FROM waste_catalog w JOIN waste_category c ON w.category_id = c.id_waste_category`
        return result
    } catch (error) {
        console.error('Error getting catalog from database!', error)
        throw error
    }
}