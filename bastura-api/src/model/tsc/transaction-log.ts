import { sql } from "../connection";

export const getTransactionLogs = async(id_user:string) => {
    return await sql`SELECT 
    id_transaksi,
    jenis_transaksi,
    deskripsi,
    nominal,
    status,
    tanggal_transaksi
    FROM view_riwayat_transaksi
    WHERE id_user = ${id_user}
    ORDER BY tanggal_transaksi DESC;`;
}