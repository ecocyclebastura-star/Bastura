import { sql } from "../connection"
export const getAdminContactModel = async () => {
    try {
        const result = await sql`SELECT email , phone FROM users WHERE role_id = 3`
        return result
    } catch (error) {
        console.error('Error getting admin contact from database!', error)
        throw error
    }
}