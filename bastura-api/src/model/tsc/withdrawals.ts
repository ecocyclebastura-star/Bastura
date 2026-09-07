import { sql } from "../connection"

export const takeWithdrawals = async (id_user: string, amount: number) => {
    try {
        const check_balance = await sql`SELECT total_balance FROM balance WHERE id_user = ${id_user}`

        if (!check_balance || check_balance.length === 0) {
            return "USER_NOT_FOUND"
        }

        if (check_balance[0].total_balance < amount) {
            return "INSUFFICIENT_BALANCE"
        }

        await sql.begin(async (tx) => {
            await tx`INSERT INTO withdrawals (id_user, amount) VALUES (${id_user}, ${amount})`
            await tx`UPDATE update_logs SET transaction_up = now() WHERE id_update = 1`
        })

        return "SUCCESS"
    } catch (error: any) {
        throw error
    }
}