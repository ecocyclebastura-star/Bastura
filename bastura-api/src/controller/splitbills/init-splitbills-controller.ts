import { Context } from 'hono';
import { TBBalance } from '../type/transaction-type';
import { sendtscResponse } from '../../logs/tsc/tsc-logs';
import { initSplitbills } from '../../model/splitbills/init-splitbills';

/**
 * POST /api/v1/splitbills/init
 * Body: { total_dana: number, date_start: string, date_end: string }
 *
 * Menghitung preview splitbills:
 * - Fee/pajak admin dari DB
 * - Dana bersih setelah pajak
 * - Daftar warga yang setoran dalam periode + estimasi alokasi proporsional
 *
 * Data dikembalikan ke frontend untuk dimodifikasi sebelum konfirmasi.
 */
export const initSplitbillsController = async (c: Context) => {
    const action = 'init_splitbills';

    try {
        const jwtPayload = c.get('jwtPayload') as TBBalance;
        if (!jwtPayload) {
            return sendtscResponse(c, 401, action, 'error', 'SPLITBILLS', 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID');
        }

        const admin_id = jwtPayload.sub;
        const body = await c.req.json();
        const { total_dana, date_start, date_end } = body;

        if (!total_dana || !date_start || !date_end) {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Data tidak lengkap', 'total_dana, date_start, dan date_end wajib diisi',
                null, 'MISSING_PARAMS'
            );
        }
        if (typeof total_dana !== 'number' || total_dana <= 0) {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Total dana tidak valid', 'Total dana harus berupa angka positif',
                null, 'INVALID_AMOUNT'
            );
        }

        const result = await initSplitbills(admin_id, total_dana, date_start, date_end);

        if (result === 'FEE_NOT_FOUND') {
            return sendtscResponse(c, 500, action, 'error', 'SPLITBILLS',
                'Konfigurasi pajak belum tersedia', 'Hubungi super admin untuk mengatur nilai pajak',
                null, 'FEE_NOT_FOUND'
            );
        }
        if (result === 'NO_WARGA_FOUND') {
            return sendtscResponse(c, 404, action, 'error', 'SPLITBILLS',
                'Tidak ada warga yang setoran dalam periode ini',
                'Tidak ada warga aktif yang melakukan setoran dalam rentang tanggal yang dipilih',
                null, 'NO_WARGA_FOUND'
            );
        }

        return sendtscResponse(c, 200, action, 'success', 'SPLITBILLS',
            'Preview splitbills berhasil dihitung', 'Preview splitbills berhasil dihitung',
            result, 'INIT_SPLITBILLS_SUCCESS'
        );

    } catch (error) {
        console.error('Error di init-splitbills-controller:', error);
        return sendtscResponse(c, 500, action, 'error', 'SPLITBILLS',
            'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR'
        );
    }
};
