import { sql } from '../connection';

export type AlokasiInput = {
    id_user: string;
    final_amount: number;
};

export type ConfirmSplitbillsResult = {
    id_sb: string;
    total_sb: number;
    fee_persen: number;
    fee_amount: number;
    dana_setelah_pajak: number;
    date_start: string;
    date_end: string;
    jumlah_warga: number;
    total_didistribusikan: number;
    processed_by: string;
    processed_at: Date;
};

/**
 * Konfirmasi & finalisasi splitbills.
 * Menerima alokasi final dari frontend, lalu:
 * 1. Validasi semua id_user adalah warga (role_id = 1), bukan admin
 * 2. Validasi total alokasi = dana_setelah_pajak (remaining = 0)
 * 3. INSERT split_bills dengan status 'completed' langsung
 * 4. INSERT sb_allocations per warga
 * 5. UPDATE balance tiap warga (trigger sync otomatis ke users.total_balance)
 * 6. INSERT profit (rekam fee admin)
 * 7. UPDATE update_logs
 */
export const confirmSplitbills = async (
    admin_id: string,
    total_dana: number,
    date_start: string,
    date_end: string,
    alokasi: AlokasiInput[]
): Promise<
    ConfirmSplitbillsResult
    | 'FEE_NOT_FOUND'
    | 'ADMIN_IN_ALLOCATION'
    | 'INVALID_USER_IN_ALLOCATION'
    | 'INVALID_AMOUNT'
    | 'REMAINING_NOT_ZERO'
    | 'NO_ALLOCATIONS'
> => {
    try {
        const result = await sql.begin(async (tx) => {
            await tx`SELECT set_config('app.current_user_id', ${admin_id}, true)`;
            await tx`SELECT set_config('app.current_user_role', 'admin', true)`;

            // Validasi: minimal ada 1 warga
            if (!alokasi || alokasi.length === 0) return 'NO_ALLOCATIONS';

            // Ambil fee terbaru
            const feeRows = await tx`
                SELECT amount_fee FROM fee ORDER BY created_at DESC LIMIT 1
            `;
            if (feeRows.length === 0) return 'FEE_NOT_FOUND';

            const fee_persen         = Number(feeRows[0].amount_fee);
            const fee_amount         = Math.floor(total_dana * fee_persen / 100);
            const dana_setelah_pajak = total_dana - fee_amount;

            // Validasi: semua amount positif
            for (const item of alokasi) {
                if (typeof item.final_amount !== 'number' || item.final_amount <= 0) {
                    return 'INVALID_AMOUNT';
                }
            }

            // Validasi: semua id_user adalah warga (role_id = 1)
            const userIds = alokasi.map(a => a.id_user);
            const userRows = await tx`
                SELECT id_users, role_id
                FROM users
                WHERE id_users = ANY(${userIds}::uuid[])
            `;

            if (userRows.length !== userIds.length) return 'INVALID_USER_IN_ALLOCATION';
            for (const u of userRows) {
                if (Number(u.role_id) !== 1) return 'ADMIN_IN_ALLOCATION';
            }

            // Validasi KRITIS: total alokasi HARUS = dana_setelah_pajak
            const total_dialokasikan = alokasi.reduce((acc, a) => acc + a.final_amount, 0);
            if (total_dialokasikan !== dana_setelah_pajak) return 'REMAINING_NOT_ZERO';

            // INSERT split_bills — status langsung 'completed'
            const sbRows = await tx`
                INSERT INTO split_bills (
                    total_sb, date_start, date_end,
                    remaining_sb, status, processed_by
                )
                VALUES (
                    ${total_dana},
                    ${date_start}::TIMESTAMPTZ,
                    ${date_end}::TIMESTAMPTZ,
                    0,
                    'completed',
                    ${admin_id}
                )
                RETURNING id_sb, processed_at
            `;

            const id_sb = sbRows[0].id_sb as string;

            // Kunci agar tidak bisa diklaim ulang: 
            // Ubah status deposit dari 'processed' jadi 'success' di periode ini
            await tx`
                UPDATE deposit
                SET 
                    dp_status = 'success',
                    updated_at = now()
                WHERE dp_status = 'processed'
                  AND created_at >= ${date_start}::TIMESTAMPTZ
                  AND created_at <= (${date_end}::DATE + INTERVAL '1 day - 1 second')::TIMESTAMPTZ
            `;

            // INSERT sb_allocations + UPDATE balance per warga (dalam 1 transaksi)
            for (const item of alokasi) {
                await tx`
                    INSERT INTO sb_allocations (id_sb, id_user, final_amount)
                    VALUES (${id_sb}, ${item.id_user}, ${item.final_amount})
                `;
                // Distribusikan ke saldo — trigger sync_user_balance otomatis update users.total_balance
                await tx`
                    UPDATE balance
                    SET
                        total_balance = total_balance + ${item.final_amount},
                        updated_at    = now()
                    WHERE id_user = ${item.id_user}
                `;
            }

            // Rekam fee/profit admin
            await tx`INSERT INTO profit (amount_profit) VALUES (${fee_amount})`;

            // Update log
            await tx`UPDATE update_logs SET transaction_up = now() WHERE id_update = 1`;

            return {
                id_sb,
                total_sb:              total_dana,
                fee_persen,
                fee_amount,
                dana_setelah_pajak,
                date_start,
                date_end,
                jumlah_warga:          alokasi.length,
                total_didistribusikan: total_dialokasikan,
                processed_by:          admin_id,
                processed_at:          sbRows[0].processed_at,
            } as ConfirmSplitbillsResult;
        });

        return result as ConfirmSplitbillsResult | 'FEE_NOT_FOUND' | 'ADMIN_IN_ALLOCATION' | 'INVALID_USER_IN_ALLOCATION' | 'INVALID_AMOUNT' | 'REMAINING_NOT_ZERO' | 'NO_ALLOCATIONS';
    } catch (error) {
        throw error;
    }
};
