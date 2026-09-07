import { Context } from "hono";
import { getbalance } from "../../model/tsc/balance"
import { sendtscResponse } from "../../logs/tsc/tsc-logs";
import { TBBalance } from "../type/transaction-type";

export const getbalanceController = async (c: Context) => {
    const action = "getbalance"

    try {
        const jwtPayload = c.get('jwtPayload') as TBBalance
        
        if (!jwtPayload) {
            return sendtscResponse(c, 401,'SALDO_REALTIME', 'error', action, 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID')
        }

        const { sub, email, role } = jwtPayload

        const user_balance = await getbalance(sub)

        if (!user_balance) {
            return sendtscResponse(c, 404, 'SALDO_REALTIME', 'error', action, 'User not found', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        } 

        return sendtscResponse(c, 200, 'SALDO_REALTIME', 'success', action, 'Saldo berhasil diambil', 'Saldo berhasil diambil', {
            total_balance: user_balance.total_balance
        },'GET_BALANCE_SUCCESS')
    } catch (error) {
        console.error("Error di get-balance:", error);
        return sendtscResponse(c, 500, 'SALDO_REALTIME', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}
