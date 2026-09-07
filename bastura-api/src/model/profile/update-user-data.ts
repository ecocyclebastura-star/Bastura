import { sql } from "../connection"

export const updateUserData = async (id : string , name : string , new_name?: string , new_phone?: string) =>{

    try {
        
        if(new_name && new_phone) {
            const result = await sql.begin(async (tx) => {
                const updated = await tx`UPDATE users SET name = ${new_name} , phone = ${new_phone} , updated_at = ${new Date()} WHERE id_users = ${id} AND name = ${name} RETURNING name , email , phone , avatar_url`
                await tx`UPDATE update_logs SET profile_up = now() WHERE id_update = 1`
                return updated
            })
            return result
        }
        
        if(new_name) {
            const result = await sql.begin(async (tx) => {
                const updated = await tx`UPDATE users SET name = ${new_name} , updated_at = ${new Date()} WHERE id_users = ${id} AND name = ${name} RETURNING name , email , phone , avatar_url`
                await tx`UPDATE update_logs SET profile_up = now() WHERE id_update = 1`
                return updated
            })
            return result
        }

        if(new_phone) {
            const result = await sql.begin(async (tx) => {
                const updated = await tx`UPDATE users SET phone = ${new_phone} , updated_at = ${new Date()} WHERE id_users = ${id} AND name = ${name} RETURNING name , email , phone , avatar_url`
                await tx`UPDATE update_logs SET profile_up = now() WHERE id_update = 1`
                return updated
            })
            return result
        }
    } catch (error) {
        console.error('Error updating user data from database!', error)
        throw error
    }
}   