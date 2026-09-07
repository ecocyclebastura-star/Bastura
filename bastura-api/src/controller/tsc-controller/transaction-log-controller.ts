import { Context } from "hono";
import { TBBalance } from "../type/transaction-type";
import { getTransactionLogs } from "../../model/tsc/transaction-log";
import { sendtscResponse } from "../../logs/tsc/tsc-logs";

export const getTransactionLogController = async (c: Context) => {
    const action = "get_transaction_log";

    try {
        const jwtPayload = c.get('jwtPayload') as TBBalance;

        if (!jwtPayload) {
            return sendtscResponse(c, 401, action, 'error', 'GET_TRANSACTION_LOG', 'Token tidak valid', 'Token tidak valid', undefined, 'TOKEN_INVALID');
        }

        const { sub } = jwtPayload;

        const logs = await getTransactionLogs(sub);

        if (!logs || logs.length === 0) {
            return sendtscResponse(c, 404, action, 'error', 'GET_TRANSACTION_LOG', 'Riwayat transaksi tidak ditemukan', 'Riwayat transaksi tidak ditemukan', undefined, 'DATA_NOT_FOUND');
        }

        const transactionLogs = logs.map((log: any) => ({
            id_transaksi: log.id_transaksi,
            jenis_transaksi: log.jenis_transaksi,
            deskripsi: log.deskripsi,
            nominal: log.nominal,
            status: log.status,
            tanggal_transaksi: log.tanggal_transaksi,
        }));

        return sendtscResponse(c, 200, action, 'success', 'GET_TRANSACTION_LOG', 'Riwayat transaksi berhasil diambil', 'Riwayat transaksi berhasil diambil', { data: transactionLogs }, 'GET_TRANSACTION_LOG_SUCCESS');

    } catch (error) {
        console.error("Error di transaction-log-controller:", error);
        return sendtscResponse(c, 500, action, 'error', 'GET_TRANSACTION_LOG', 'Internal Server Error', 'Internal Server Error', undefined, 'INTERNAL_SERVER_ERROR');
    }
};