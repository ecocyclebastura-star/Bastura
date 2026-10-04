import { sql } from "../connection";

export const getCatalogForAIModel = async () => {
    try {
        // Ambil semua katalog yang aktif (belum dihapus/soft-delete jika ada, asumsikan deleted_at IS NULL)
        const result = await sql`
            SELECT id_waste, name, description, price 
            FROM waste_catalog 
            WHERE deleted_at IS NULL
        `;
        return result;
    } catch (error) {
        console.error('Error getting catalog for AI from database!', error);
        throw error;
    }
}
