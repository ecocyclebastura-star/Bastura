import { sql } from "../connection"

export const updateAddUserPhotoModel = async (id : string  , avatar_url : string) => {
    try {
        const result = await sql.begin(async (tx) => {
            const updated = await tx`UPDATE users SET avatar_url = ${avatar_url} , updated_at = ${new Date()} WHERE id_users = ${id} RETURNING name , email , phone , avatar_url`
            await tx`UPDATE update_logs SET profile_up = now() WHERE id_update = 1`
            return updated
        })
        return result
        
    } catch (error) {
        console.error('Error updating user photo from database!', error)
        throw error
    }
}