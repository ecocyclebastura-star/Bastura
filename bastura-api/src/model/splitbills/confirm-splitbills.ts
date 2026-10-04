import { hitungKomisi, getCurrentFee } from '../komisi/fee-helper';
import { bagiDeposit } from './bagi-deposit';
import { sql } from '../connection';

export type AlokasiInput = {
    id_user: string;
    final_amount: number;
};

export type ConfirmSplitbillsResult = {
    id_sb: string;
    total_sb: number;
    fee_persen: string;
    fee_amount: number;
    dana_setelah_pajak: number;
    date_start: string;
    date_end: string;
    jumlah_warga: number;
    jumlah_deposit_dibagikan: number;
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
    alokasi: AlokasiInput[],
    client_fee_persen?: string | null
): Promise<
    ConfirmSplitbillsResult
    | 'FEE_NOT_FOUND'
    | 'FEE_CHANGED'
    | 'ADMIN_IN_ALLOCATION'
    | 'INVALID_USER_IN_ALLOCATION'
    | 'INVALID_AMOUNT'
    | 'REMAINING_NOT_ZERO'
    | 'NO_ALLOCATIONS'
    | 'DEPOSIT_NOT_FOUND'
    | 'NO_DEPOSIT_FOR_USER'
    | 'BALANCE_NOT_FOUND'
> => {
    try {
        if (!Number.isSafeInteger(total_dana)) {
            throw new Error("total_dana harus berupa integer yang aman");
        }

        const result = await sql.begin(async (tx) => {
            await tx`SELECT set_config('app.current_user_id', ${admin_id}, true)`;
            await tx`SELECT set_config('app.current_user_role', 'admin', true)`;

            // Ambil fee terbaru dari DB
            const fee_persen = await getCurrentFee(tx);
            if (!fee_persen) return 'FEE_NOT_FOUND';

            // Pengecekan FEE_CHANGED mendahului validasi alokasi
            if (client_fee_persen) {
                const dbBasisPoin = Math.round(parseFloat(fee_persen) * 100);
                const clientBasisPoin = Math.round(parseFloat(client_fee_persen) * 100);
                if (dbBasisPoin !== clientBasisPoin) {
                    return 'FEE_CHANGED';
                }
            }

            // Validasi: minimal ada 1 warga
            if (!alokasi || alokasi.length === 0) return 'NO_ALLOCATIONS';

            const fee_amount         = hitungKomisi(total_dana, fee_persen);
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
                    remaining_sb, status, fee_percent, processed_by
                )
                VALUES (
                    ${total_dana},
                    ${date_start}::TIMESTAMPTZ,
                    ${date_end}::TIMESTAMPTZ,
                    0,
                    'completed',
                    ${fee_persen},
                    ${admin_id}
                )
                RETURNING id_sb, processed_at
            `;

            const id_sb = sbRows[0].id_sb as string;

            // Kunci agar tidak bisa diklaim ulang dan ambil kandidat per warga:
            const candidateDeposits = await tx`
                SELECT d.id_deposit, d.id_user, d.weight_dp, wc.price, d.created_at
                FROM deposit d
                JOIN waste_catalog wc ON d.catalog_id = wc.id_waste
                WHERE d.dp_status = 'processed'
                  AND d.amount_sb IS NULL
                  AND d.id_user = ANY(${userIds}::uuid[])
                  AND d.created_at >= ${date_start}::TIMESTAMPTZ
                  AND d.created_at <= (${date_end}::DATE + INTERVAL '1 day - 1 second')::TIMESTAMPTZ
                ORDER BY d.id_deposit
                FOR UPDATE
            `;

            if (candidateDeposits.length === 0) {
                throw new Error('DEPOSIT_NOT_FOUND');
            }

            // Group by id_user
            const userDeposits = new Map<string, any[]>();
            for (const d of candidateDeposits) {
                if (!userDeposits.has(d.id_user)) userDeposits.set(d.id_user, []);
                userDeposits.get(d.id_user)!.push(d);
            }

            // Validasi: Pastikan semua user dalam alokasi punya deposit kandidat
            for (const id of userIds) {
                if (!userDeposits.has(id)) {
                    throw new Error('NO_DEPOSIT_FOR_USER');
                }
            }

            // Hitung alokasi per deposit
            const allocatedDeposits = [];
            for (const item of alokasi) {
                const deps = userDeposits.get(item.id_user)!;
                const resultBagi = bagiDeposit(item.final_amount, deps);
                allocatedDeposits.push(...resultBagi);
            }

            // UPDATE deposit dengan hasil pembagian
            for (const d of allocatedDeposits) {
                const updateRes = await tx`
                    UPDATE deposit
                    SET 
                        amount_sb = ${d.amount_sb},
                        id_sb = ${id_sb},
                        dp_status = 'success',
                        updated_at = now()
                    WHERE id_deposit = ${d.id_deposit}
                `;
                if (updateRes.count !== 1) throw new Error("Gagal update deposit");
            }

            // INSERT sb_allocations + UPDATE balance per warga
            for (const item of alokasi) {
                await tx`
                    INSERT INTO sb_allocations (id_sb, id_user, final_amount)
                    VALUES (${id_sb}, ${item.id_user}, ${item.final_amount})
                `;
                const balRes = await tx`
                    UPDATE balance
                    SET
                        total_balance = total_balance + ${item.final_amount},
                        updated_at    = now()
                    WHERE id_user = ${item.id_user}
                `;
                if (balRes.count !== 1) throw new Error('BALANCE_NOT_FOUND');
            }

            // Rekam fee/profit admin dan hubungkan ke id_sb
            await tx`INSERT INTO profit (amount_profit, id_sb) VALUES (${fee_amount}, ${id_sb})`;

            // Audit Log
            await tx`
                INSERT INTO audit_logs (actor_id, target_id, action_type, details)
                VALUES (
                    ${admin_id},
                    ${id_sb},
                    'CONFIRM_SPLITBILLS',
                    ${JSON.stringify({
                        jumlah_warga: alokasi.length,
                        jumlah_deposit: allocatedDeposits.length,
                        total_dana: total_dana
                    })}
                )
            `;

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
                jumlah_deposit_dibagikan: allocatedDeposits.length,
                total_didistribusikan: total_dialokasikan,
                processed_by:          admin_id,
                processed_at:          sbRows[0].processed_at,
            } as ConfirmSplitbillsResult;
        });

        return result as ConfirmSplitbillsResult | 'FEE_NOT_FOUND' | 'FEE_CHANGED' | 'ADMIN_IN_ALLOCATION' | 'INVALID_USER_IN_ALLOCATION' | 'INVALID_AMOUNT' | 'REMAINING_NOT_ZERO' | 'NO_ALLOCATIONS' | 'DEPOSIT_NOT_FOUND' | 'NO_DEPOSIT_FOR_USER' | 'BALANCE_NOT_FOUND';
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'DEPOSIT_NOT_FOUND') return 'DEPOSIT_NOT_FOUND';
            if (error.message === 'NO_DEPOSIT_FOR_USER') return 'NO_DEPOSIT_FOR_USER';
            if (error.message === 'BALANCE_NOT_FOUND') return 'BALANCE_NOT_FOUND';
        }
        throw error;
    }
};
