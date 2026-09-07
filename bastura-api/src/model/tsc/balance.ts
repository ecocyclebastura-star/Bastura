import { sql } from '../connection'

export const getbalance = async (id : string) => {

    const result = await sql`SELECT total_balance FROM balance WHERE id_user = ${id}`
    return result.length > 0 ? result[0] : null
    
}
    
export const checkuservalid = async (id : string , email :string ) => {
    
    const result = await sql`SELECT id_users, role_id, status_active FROM users WHERE email = ${email} AND id_users = ${id}`
    return result.length > 0 ? result[0] : null

}   