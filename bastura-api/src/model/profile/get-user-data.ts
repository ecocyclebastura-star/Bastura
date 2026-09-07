import { sql } from "../connection";

export const getUserData = async (id : string) => {
    try {
        const result = await sql`SELECT name , email , phone , avatar_url FROM users WHERE id_users = ${id}`
        return result
    } catch (error) {
        console.error('Error getting user data from database!', error)
        throw error
    }
}