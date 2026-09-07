import { sql } from '../connection'

export const get_edu = async ( id : string , email : string) => {
    
    const check_user = await sql`SELECT id_users FROM users WHERE email = ${email ?? null} OR id_users = ${id ?? null}`

    if (check_user.length === 0) {
        return "USER_NOT_FOUND"
    }

    const result = await sql`SELECT * FROM education_content`

    return result.length > 0 ? result : null
} // Finaly bisa pake komen sejuta umat T_T