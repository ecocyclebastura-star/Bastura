import { sql } from "../connection"

export const deleteUserData = async (id : string) => {
    try {
        const result = await sql.begin(async (tx) => {
            const deleted = await tx`UPDATE users SET status_active = 'deleted' , deleted_at = ${new Date()} , updated_at = ${new Date()} WHERE id_users = ${id} RETURNING name , status_active , deleted_at`
            await tx`UPDATE update_logs SET profile_up = now() WHERE id_update = 1`
            return deleted
        })
        return result
    } catch (error) {
        console.error('Error deleting user data from database!', error)
        throw error
    }
}   