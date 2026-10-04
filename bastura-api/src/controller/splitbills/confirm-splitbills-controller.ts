import { Context } from 'hono';
import { TBBalance } from '../type/transaction-type';
import { sendtscResponse } from '../../logs/tsc/tsc-logs';
import { confirmSplitbills } from '../../model/splitbills/confirm-splitbills';
import { parseFeePercent } from '../../model/komisi/fee-helper';

/**
 * POST /api/v1/splitbills/confirm
 * Body: { total_dana, date_start, date_end, alokasi: [{id_user, final_amount}] }
 *
 * Menerima alokasi final dari frontend (setelah admin selesai mengedit).
 * Validasi dan distribusikan dana ke saldo setiap warga secara atomik.
 *
 * Validasi backend:
 * - total alokasi HARUS = dana_setelah_pajak (remaining = 0)
 * - Semua id_user harus warga (role_id = 1), bukan admin
 * - Minimal ada 1 warga dalam daftar
 */
export const confirmSplitbillsController = async (c: Context) => {
    const action = 'confirm_splitbills';

    try {
        const jwtPayload = c.get('jwtPayload') as TBBalance;
        if (!jwtPayload) {
            return sendtscResponse(c, 401, action, 'error', 'SPLITBILLS', 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID');
        }

        const admin_id = jwtPayload.sub;
        const body = await c.req.json();
        const { total_dana, date_start, date_end, alokasi, fee_persen } = body;

        if (!total_dana || !date_start || !date_end) {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Data tidak lengkap', 'total_dana, date_start, date_end, dan alokasi wajib diisi',
                null, 'MISSING_PARAMS'
            );
        }
        if (typeof total_dana !== 'number' || total_dana <= 0) {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Total dana tidak valid', 'Total dana harus berupa angka positif',
                null, 'INVALID_AMOUNT'
            );
        }
        if (!Array.isArray(alokasi)) {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Format alokasi tidak valid', 'alokasi harus berupa array',
                null, 'INVALID_FORMAT'
            );
        }

        let parsedFeePersen: string | null = null;
        if (fee_persen !== undefined) {
            parsedFeePersen = parseFeePercent(fee_persen);
            if (!parsedFeePersen) {
                return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                    'Format fee_persen tidak valid', 'fee_persen harus berupa angka atau string desimal maksimal 2 angka',
                    null, 'INVALID_FEE_PERCENT'
                );
            }
        }

        const result = await confirmSplitbills(admin_id, total_dana, date_start, date_end, alokasi, parsedFeePersen);

        if (result === 'FEE_NOT_FOUND') {
            return sendtscResponse(c, 500, action, 'error', 'SPLITBILLS',
                'Konfigurasi pajak belum tersedia', 'Hubungi super admin untuk mengatur nilai pajak',
                null, 'FEE_NOT_FOUND'
            );
        }
        if (result === 'NO_ALLOCATIONS') {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Daftar warga kosong', 'Tambahkan minimal 1 warga ke daftar penerima dana',
                null, 'NO_ALLOCATIONS'
            );
        }
        if (result === 'FEE_CHANGED') {
            return sendtscResponse(c, 409, action, 'warning', 'SPLITBILLS',
                'Persentase komisi telah berubah', 'Persentase komisi berubah, silakan hitung ulang',
                null, 'FEE_CHANGED'
            );
        }
        if (result === 'DEPOSIT_NOT_FOUND') {
            return sendtscResponse(c, 409, action, 'error', 'SPLITBILLS',
                'Data setoran tidak ditemukan', 'Periode ini sudah kosong atau setoran telah diproses',
                null, 'DEPOSIT_NOT_FOUND'
            );
        }
        if (result === 'NO_DEPOSIT_FOR_USER') {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Terdapat warga tanpa setoran', 'Warga dalam daftar alokasi wajib memiliki setoran di periode ini',
                null, 'NO_DEPOSIT_FOR_USER'
            );
        }
        if (result === 'BALANCE_NOT_FOUND') {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Gagal menyalurkan ke saldo', 'Terdapat akun warga yang saldonya gagal diperbarui',
                null, 'BALANCE_NOT_FOUND'
            );
        }
        if (result === 'ADMIN_IN_ALLOCATION') {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Admin tidak boleh menjadi peserta splitbills',
                'Akun admin tidak diizinkan berada dalam daftar penerima dana',
                null, 'ADMIN_IN_ALLOCATION'
            );
        }
        if (result === 'INVALID_USER_IN_ALLOCATION') {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Terdapat ID warga yang tidak valid',
                'Pastikan semua ID warga yang dimasukkan terdaftar di sistem',
                null, 'INVALID_USER_IN_ALLOCATION'
            );
        }
        if (result === 'INVALID_AMOUNT') {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Nominal alokasi tidak valid', 'Semua nominal alokasi harus berupa angka positif',
                null, 'INVALID_AMOUNT'
            );
        }
        if (result === 'REMAINING_NOT_ZERO') {
            return sendtscResponse(c, 400, action, 'error', 'SPLITBILLS',
                'Dana belum habis dibagi',
                'Total alokasi harus sama persis dengan dana setelah pajak. Pastikan sisa dana = 0',
                null, 'REMAINING_NOT_ZERO'
            );
        }

        return sendtscResponse(c, 200, action, 'success', 'SPLITBILLS',
            'Dana berhasil dibagikan kepada seluruh warga',
            'Dana berhasil dibagikan kepada seluruh warga',
            result, 'CONFIRM_SUCCESS'
        );

    } catch (error) {
        console.error('Error di confirm-splitbills-controller:', error);
        return sendtscResponse(c, 500, action, 'error', 'SPLITBILLS',
            'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR'
        );
    }
};
