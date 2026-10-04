import { sql } from '../connection';
import { getCurrentFee, parseFeePercent } from './fee-helper';

export type SegmenKomisi = {
    percentage: string;
    total_fund: number;
    commission: number;
};

export type KomisiHistoryRow = {
    periode: string; // YYYY-MM
    total_dana: number;
    total_profit: number;
    percentage_label: string;
};

export type KomisiSummaryResult = {
    current_fee_percentage: string | null;
    current_month_total_dana: number;
    current_month_profit: number;
    history: KomisiHistoryRow[];
};

export type KomisiDetailResult = {
    periode: string;
    total_dana: number;
    total_profit: number;
    segments: SegmenKomisi[];
};

/**
 * Mendapatkan ringkasan komisi bulan berjalan dan riwayat bulan sebelumnya
 */
export const getKomisiSummary = async (limit: number = 12, offset: number = 0): Promise<KomisiSummaryResult> => {
    // Zona waktu bisnis (bisa disesuaikan, misal Asia/Jakarta)
    const timezone = 'Asia/Jakarta';

    const result = await sql.begin(async (tx) => {
        // 1. Dapatkan fee terbaru
        const current_fee = await getCurrentFee(tx);

        // 2. Dapatkan total dana dan profit bulan BERJALAN (menggunakan zona waktu Asia/Jakarta)
        // Bulan berjalan adalah dari awal bulan ini hingga akhir bulan ini
        const currentMonthRows = await tx`
            WITH current_month AS (
                SELECT date_trunc('month', now() AT TIME ZONE ${timezone}) AS start_date
            )
            SELECT 
                COALESCE(SUM(sb.total_sb), 0)::BIGINT AS total_dana,
                COALESCE(SUM(p.amount_profit), 0)::BIGINT AS total_profit
            FROM split_bills sb
            LEFT JOIN profit p ON sb.id_sb = p.id_sb
            CROSS JOIN current_month cm
            WHERE sb.status = 'completed'
              AND (sb.processed_at AT TIME ZONE ${timezone}) >= cm.start_date
        `;

        // 3. Dapatkan riwayat per bulan (hanya bulan yang ada transaksinya)
        const historyRows = await tx`
            SELECT 
                to_char(sb.processed_at AT TIME ZONE ${timezone}, 'YYYY-MM') AS periode,
                COALESCE(SUM(sb.total_sb), 0)::BIGINT AS total_dana,
                COALESCE(SUM(p.amount_profit), 0)::BIGINT AS total_profit,
                COUNT(DISTINCT sb.fee_percent) AS fee_count,
                MAX(sb.fee_percent) AS max_fee
            FROM split_bills sb
            LEFT JOIN profit p ON sb.id_sb = p.id_sb
            WHERE sb.status = 'completed'
            GROUP BY periode
            ORDER BY periode DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const history: KomisiHistoryRow[] = historyRows.map((row: any) => {
            const count = Number(row.fee_count);
            // Jika ada lebih dari 1 tarif, label = "Bervariasi", jika tidak, tunjukkan angkanya
            const label = count > 1 ? "Bervariasi" : `${parseFloat(row.max_fee).toFixed(2)}%`;
            return {
                periode: row.periode,
                total_dana: Number(row.total_dana),
                total_profit: Number(row.total_profit),
                percentage_label: label
            };
        });

        return {
            current_fee_percentage: current_fee,
            current_month_total_dana: Number(currentMonthRows[0].total_dana),
            current_month_profit: Number(currentMonthRows[0].total_profit),
            history
        };
    });

    return result;
};

/**
 * Mendapatkan rincian komisi berdasarkan segmen fee untuk suatu bulan/periode (YYYY-MM)
 */
export const getKomisiDetail = async (periode: string): Promise<KomisiDetailResult> => {
    const timezone = 'Asia/Jakarta';

    const segmentsRows = await sql`
        SELECT 
            sb.fee_percent,
            COALESCE(SUM(sb.total_sb), 0)::BIGINT AS total_fund,
            COALESCE(SUM(p.amount_profit), 0)::BIGINT AS commission
        FROM split_bills sb
        LEFT JOIN profit p ON sb.id_sb = p.id_sb
        WHERE sb.status = 'completed'
          AND to_char(sb.processed_at AT TIME ZONE ${timezone}, 'YYYY-MM') = ${periode}
        GROUP BY sb.fee_percent
        ORDER BY sb.fee_percent ASC
    `;

    const segments: SegmenKomisi[] = segmentsRows.map((row: any) => ({
        percentage: parseFloat(row.fee_percent).toFixed(2),
        total_fund: Number(row.total_fund),
        commission: Number(row.commission)
    }));

    const total_dana = segments.reduce((acc, seg) => acc + seg.total_fund, 0);
    const total_profit = segments.reduce((acc, seg) => acc + seg.commission, 0);

    return {
        periode,
        total_dana,
        total_profit,
        segments
    };
};

/**
 * Memperbarui persentase komisi
 */
export const updateKomisiFee = async (admin_id: string, new_fee: string, old_fee: string): Promise<'SUCCESS' | 'OLD_FEE_MISMATCH'> => {
    try {
        const result = await sql.begin(async (tx) => {
            // Ambil lock transaksional untuk menghindari race condition
            // pg_advisory_xact_lock dengan hashtext('fee')
            await tx`SELECT pg_advisory_xact_lock(hashtext('fee'))`;

            const current_fee = await getCurrentFee(tx);
            
            // Konversi ke basis poin integer untuk perbandingan presisi tinggi
            const dbBasisPoin = current_fee ? Math.round(parseFloat(current_fee) * 100) : 0;
            const oldBasisPoin = Math.round(parseFloat(old_fee) * 100);

            if (dbBasisPoin !== oldBasisPoin && current_fee !== null) {
                return 'OLD_FEE_MISMATCH';
            }

            // Jika sama persis, abaikan atau tetap sukses
            const newBasisPoin = Math.round(parseFloat(new_fee) * 100);
            if (dbBasisPoin === newBasisPoin) {
                return 'SUCCESS';
            }

            // Insert fee baru
            const insertFeeRows = await tx`
                INSERT INTO fee (amount_fee) 
                VALUES (${new_fee})
                RETURNING id_fee
            `;

            // Catat audit_logs
            await tx`
                INSERT INTO audit_logs (actor_id, target_id, action_type, details)
                VALUES (
                    ${admin_id}, 
                    ${insertFeeRows[0].id_fee}, 
                    'UPDATE_FEE', 
                    ${JSON.stringify({ old_fee, new_fee })}
                )
            `;

            return 'SUCCESS';
        });

        return result;
    } catch (error) {
        throw error;
    }
};
