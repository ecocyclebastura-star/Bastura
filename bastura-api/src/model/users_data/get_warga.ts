import { sql } from "../connection"

export const get_warga = async () => {
    try {
        const result = await sql`SELECT * FROM view_data_warga`
        return result
    } catch (error) {
        console.error('Error getting warga from database!', error)
        throw error
    }
}
