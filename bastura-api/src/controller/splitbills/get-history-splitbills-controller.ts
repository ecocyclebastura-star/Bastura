import { Context } from 'hono';
import { sendtscResponse } from '../../logs/tsc/tsc-logs';
import { getHistorySplitbills } from '../../model/splitbills/get-history-splitbills';

/**
 * GET /api/v1/splitbills/history
 *
 * Mengembalikan daftar riwayat splitbills yang pernah dilakukan.
 * Termasuk nama admin yang memproses pembagian tersebut.
 */
export const getHistorySplitbillsController = async (c: Context) => {
    const action = 'get_history_splitbills';

    try {
        const result = await getHistorySplitbills();

        if (result.length === 0) {
            return sendtscResponse(c, 200, action, 'success', 'SPLITBILLS',
                'Riwayat splitbills kosong', 'Belum ada pembagian dana splitbills yang dilakukan',
                [], 'HISTORY_EMPTY'
            );
        }

        return sendtscResponse(c, 200, action, 'success', 'SPLITBILLS',
            'Berhasil mengambil riwayat splitbills', 'Berhasil mengambil riwayat splitbills',
            result, 'HISTORY_SUCCESS'
        );

    } catch (error) {
        console.error('Error di get-history-splitbills-controller:', error);
        return sendtscResponse(c, 500, action, 'error', 'SPLITBILLS',
            'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR'
        );
    }
};
