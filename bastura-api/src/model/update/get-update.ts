import { sql } from '../connection'

export const getUpdateLogs = async () => {
    // Mengambil 1 baris data dari tabel update_logs.
    // Asumsinya tabel ini diperlakukan sebagai state global yang hanya memiliki 1 atau sedikit baris.
    const result = await sql`SELECT * FROM update_logs LIMIT 1`

    return result.length > 0 ? result[0] : null
}
