import { sql } from "../connection";

export const getOpeningSchModel = async () => {
    try {
        const result = await sql`SELECT * from jadwal_setor LIMIT 1`
        return result
    } catch (error) {
        console.error('Error getting opening schedule from database!', error)
        throw error
    }
}