import { sql } from "../connection"

export const get_warga = async (requesterRole?: number) => {
    try {
        if (requesterRole === 3) {
            // Super Admin can see Warga (1) and Admin (2)
            const result = await sql`SELECT * FROM view_data_users WHERE role_id IN (1, 2)`
            return result
        } else {
            // Admin (2) can only see Warga (1)
            const result = await sql`SELECT * FROM view_data_warga`
            return result
        }
    } catch (error) {
        console.error('Error getting warga from database!', error)
        throw error
    }
}
