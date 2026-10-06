import { sql } from "../connection"

export const updateAdminContactModel = async (phone: string) => {
    try {
        const result = await sql`
            UPDATE users 
            SET phone = ${phone}, updated_at = now()
            WHERE role_id = 3 
            RETURNING email, phone
        `
        return result
    } catch (error) {
        console.error('Error updating admin contact in database!', error)
        throw error
    }
}
