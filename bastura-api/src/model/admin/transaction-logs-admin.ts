import { sql } from '../connection'

export const getLogsAdminTsc = async (admin_id : string) => {
    try {
        const result = await sql.begin(async (tx) => {
            const is_admin = await tx`SELECT role_id FROM users WHERE id_users = ${admin_id}`;
            if(is_admin[0].role_id === 1){
                return 'ERR_NOT_ADMIN';
            }
            const result = await tx`SELECT 
            id_transaksi,
            jenis_transaksi,
            deskripsi,
            nominal,
            status,
            tanggal_transaksi,
            name
            FROM view_riwayat_transaksi
            ORDER BY tanggal_transaksi DESC;`;
            return result;
        }) 
        return result;
    } catch (error) {
        throw error;
    }
}