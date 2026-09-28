import { sql } from '../connection';

export type AlokasiPreview = {
    id_user: string;
    name: string;
    email: string;
    total_weight: number;
    total_value: number; // Nilai kontribusi (berat * harga katalog)
    estimasi_alokasi: number;
};

export type InitSplitbillsResult = {
    total_dana: number;
    fee_persen: number;
    dana_setelah_pajak: number;
    jumlah_warga: number;
    date_start: string;
    date_end: string;
    alokasi_preview: AlokasiPreview[];
};

/**
 * Kalkulasi preview splitbills:
 * 1. Ambil fee terbaru dari DB
 * 2. Hitung dana bersih setelah pajak
 * 3. Hitung kontribusi nilai tiap warga: SUM(berat * harga_katalog)
 * 4. Hitung estimasi alokasi proporsional berdasarkan total kontribusi nilai tersebut.
 */
export const initSplitbills = async (
    admin_id: string,
    total_dana: number,
    date_start: string,
    date_end: string
): Promise<InitSplitbillsResult | 'FEE_NOT_FOUND' | 'NO_WARGA_FOUND'> => {
    try {
        const result = await sql.begin(async (tx) => {
            await tx`SELECT set_config('app.current_user_id', ${admin_id}, true)`;
            await tx`SELECT set_config('app.current_user_role', 'admin', true)`;

            // Ambil fee terbaru
            const feeRows = await tx`
                SELECT amount_fee FROM fee ORDER BY created_at DESC LIMIT 1
            `;
            if (feeRows.length === 0) return 'FEE_NOT_FOUND';

            const fee_persen = Number(feeRows[0].amount_fee);
            const dana_setelah_pajak = total_dana - Math.floor(total_dana * fee_persen / 100);

            // Hitung berat setoran & nilai kontribusi (berat * harga) per warga
            const wargaRows = await tx`
                SELECT
                    u.id_users                                     AS id_user,
                    u.name,
                    u.email,
                    COALESCE(SUM(d.weight_dp), 0)::BIGINT          AS total_weight,
                    COALESCE(SUM(d.weight_dp * wc.price), 0)::BIGINT AS total_value
                FROM users u
                LEFT JOIN deposit d
                    ON  d.id_user   = u.id_users
                    AND d.dp_status = 'processed'
                    AND d.created_at >= ${date_start}::TIMESTAMPTZ
                    AND d.created_at <= (${date_end}::DATE + INTERVAL '1 day - 1 second')::TIMESTAMPTZ
                LEFT JOIN waste_catalog wc
                    ON d.catalog_id = wc.id_waste
                WHERE u.role_id       = 1
                  AND u.status_active = 'active'
                GROUP BY u.id_users, u.name, u.email
                HAVING COALESCE(SUM(d.weight_dp), 0) > 0
                ORDER BY total_value DESC
            `;

            if (wargaRows.length === 0) return 'NO_WARGA_FOUND';

            const sum_of_all_values = wargaRows.reduce(
                (acc: number, w: any) => acc + Number(w.total_value), 0
            );

            const alokasi_preview: AlokasiPreview[] = wargaRows.map((w: any) => ({
                id_user:          w.id_user,
                name:             w.name,
                email:            w.email,
                total_weight:     Number(w.total_weight),
                total_value:      Number(w.total_value),
                estimasi_alokasi: sum_of_all_values > 0
                    ? Math.floor((Number(w.total_value) / sum_of_all_values) * dana_setelah_pajak)
                    : 0,
            }));

            return {
                total_dana,
                fee_persen,
                dana_setelah_pajak,
                jumlah_warga: wargaRows.length,
                date_start,
                date_end,
                alokasi_preview,
            };
        });

        return result as InitSplitbillsResult | 'FEE_NOT_FOUND' | 'NO_WARGA_FOUND';
    } catch (error) {
        throw error;
    }
};
