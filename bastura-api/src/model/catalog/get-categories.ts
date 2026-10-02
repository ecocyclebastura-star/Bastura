import { sql } from "../connection";

export const getWasteCategoriesModel = async () => {
    try {
        const result = await sql`SELECT * FROM waste_category ORDER BY id_waste_category ASC`;
        return result;
    } catch (error) {
        console.error('Error getting categories from database!', error)
        throw error
    }
}
