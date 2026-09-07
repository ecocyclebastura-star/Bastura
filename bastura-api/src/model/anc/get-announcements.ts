import { sql } from '../connection'

export const getAnc = async (id: string , email: string) => {

    const check_user = await sql`SELECT role_id FROM users WHERE email = ${email ?? null} OR id_users = ${id ?? null}`

    if (check_user.length === 0) {
        return "USER_NOT_FOUND"
    }

    const result = await sql`SELECT * FROM announcements`

    return result.length > 0 ? result : null
}