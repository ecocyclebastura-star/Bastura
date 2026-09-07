import { sql } from "../connection"

export const cancelWithdrawals = async (id_user: string, id_transaksi: string) => {
    try {
        const result = await sql.begin(async (tx) => {
            const updated = await tx`
                UPDATE withdrawals
                SET wd_status = 'canceled', updated_at = now()
                WHERE id_wd = ${id_transaksi}
                  AND id_user = ${id_user}
                  AND wd_status = 'processed'
            `
            if (updated.count === 0) {
                return "WITHDRAWAL_NOT_FOUND"
            }

            await tx`UPDATE update_logs SET transaction_up = now() WHERE id_update = 1`
            return "CANCEL_SUCCESS"
        })
        return result
    } catch (error) {
        console.error("Error di cancel-withdrawals:", error)
        throw error
    }
}