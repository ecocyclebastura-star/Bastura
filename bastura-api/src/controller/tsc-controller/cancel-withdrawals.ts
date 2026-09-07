import {Context} from "hono";
import {sendtscResponse} from "../../logs/tsc/tsc-logs";
import {cancelWithdrawals} from "../../model/tsc/cancel-withdrawals";

export const cancelWithdrawalsController = async (c : Context) => {
    const action = "cancel_withdrawals";
    
    try {

       const userpayload = c.get('jwtPayload') as {sub: string}
       

        if(!userpayload) {
            return sendtscResponse(c, 401, action, 'error', action, 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID')
        }
        
        const id_user = userpayload.sub

        const body = await c.req.json()
        const { id_transaksi } = body

        const result = await cancelWithdrawals(id_user , id_transaksi)

        if (result === "WITHDRAWAL_NOT_FOUND") {
            return sendtscResponse(c, 404, action, 'error', action, 'Penarikan tidak ditemukan', 'Penarikan tidak ditemukan', undefined, 'WITHDRAWAL_NOT_FOUND');
        }

        const res_payload = {
            id_transaksi : id_transaksi,
            status : "canceled",
            updated_at : new Date()
        }

        return sendtscResponse(c, 200, action, 'success', action, 'Penarikan saldo berhasil dibatalkan', 'Penarikan saldo berhasil dibatalkan', res_payload, 'WITHDRAWAL_CANCELLED');
    } catch (error) {
        console.error("Error di cancel-withdrawals:", error);
        return sendtscResponse(c, 500, action, 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
    }
}