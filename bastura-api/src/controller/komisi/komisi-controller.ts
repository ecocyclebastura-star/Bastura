import { Context } from 'hono';
import { sendtscResponse } from '../../logs/tsc/tsc-logs';
import { getKomisiSummary, getKomisiDetail, updateKomisiFee } from '../../model/komisi/komisi-models';
import { parseFeePercent } from '../../model/komisi/fee-helper';
import { TBBalance } from '../type/transaction-type';

export const getKomisiSummaryController = async (c: Context) => {
    const action = 'get_komisi_summary';
    try {
        const limit = Number(c.req.query('limit')) || 12;
        const offset = Number(c.req.query('offset')) || 0;
        const result = await getKomisiSummary(limit, offset);
        return sendtscResponse(c, 200, action, 'success', 'KOMISI', 'Berhasil mengambil ringkasan komisi', null, result);
    } catch (error: any) {
        return sendtscResponse(c, 500, action, 'error', 'KOMISI', 'Gagal mengambil ringkasan komisi', error.message);
    }
};

export const getKomisiDetailController = async (c: Context) => {
    const action = 'get_komisi_detail';
    try {
        const { periode } = c.req.param();
        if (!/^\d{4}-\d{2}$/.test(periode)) {
            return sendtscResponse(c, 400, action, 'error', 'KOMISI', 'Format periode tidak valid', 'Gunakan format YYYY-MM');
        }

        const result = await getKomisiDetail(periode);
        return sendtscResponse(c, 200, action, 'success', 'KOMISI', 'Berhasil mengambil detail komisi', null, result);
    } catch (error: any) {
        return sendtscResponse(c, 500, action, 'error', 'KOMISI', 'Gagal mengambil detail komisi', error.message);
    }
};

export const updateKomisiFeeController = async (c: Context) => {
    const action = 'update_komisi_fee';
    try {
        const jwtPayload = c.get('jwtPayload') as TBBalance;
        if (!jwtPayload) {
            return sendtscResponse(c, 401, action, 'error', 'KOMISI', 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID');
        }
        
        const admin_id = jwtPayload.sub;
        const body = await c.req.json();
        const { new_fee, old_fee } = body;

        if (new_fee === undefined || old_fee === undefined) {
            return sendtscResponse(c, 400, action, 'error', 'KOMISI', 'Data tidak lengkap', 'new_fee dan old_fee wajib diisi');
        }

        const parsedNewFee = parseFeePercent(new_fee);
        const parsedOldFee = parseFeePercent(old_fee);

        if (!parsedNewFee || !parsedOldFee) {
            return sendtscResponse(c, 400, action, 'error', 'KOMISI', 'Format fee tidak valid', 'Fee harus angka maksimal 2 desimal (0-100)');
        }

        const result = await updateKomisiFee(admin_id, parsedNewFee, parsedOldFee);

        if (result === 'OLD_FEE_MISMATCH') {
            return sendtscResponse(c, 409, action, 'warning', 'KOMISI', 'Gagal memperbarui komisi', 'Komisi saat ini sudah berubah, silakan muat ulang halaman', null, 'OLD_FEE_MISMATCH');
        }

        return sendtscResponse(c, 200, action, 'success', 'KOMISI', 'Berhasil memperbarui persentase komisi', null);
    } catch (error: any) {
        return sendtscResponse(c, 500, action, 'error', 'KOMISI', 'Gagal memperbarui komisi', error.message);
    }
};
