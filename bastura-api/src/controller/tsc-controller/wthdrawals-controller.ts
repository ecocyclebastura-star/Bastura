import { Context } from "hono";
import { TBBalance } from "../type/transaction-type";
import { takeWithdrawals } from "../../model/tsc/withdrawals";
import { sendtscResponse } from "../../logs/tsc/tsc-logs";

export const takeWithdrawalsController = async (c: Context) => {
    const action = "take_withdrawals";

    try {
        const jwtPayload = c.get('jwtPayload') as TBBalance;

        if (!jwtPayload) {
            return sendtscResponse(c, 401, action, 'error', 'TAKE_WITHDRAWALS', 'Token tidak valid', 'Token tidak valid', undefined, 'TOKEN_INVALID');
        }

        const { sub } = jwtPayload;

        const body = await c.req.json();
        const { amount } = body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return sendtscResponse(c, 400, action, 'error', 'TAKE_WITHDRAWALS', 'Nominal tidak valid', 'Nominal penarikan harus berupa angka positif', undefined, 'INVALID_AMOUNT');
        }

        const result = await takeWithdrawals(sub, amount);

        if (result === "USER_NOT_FOUND") {
            return sendtscResponse(c, 404, action, 'error', 'TAKE_WITHDRAWALS', 'User tidak ditemukan', 'User tidak ditemukan', undefined, 'USER_NOT_FOUND');
        }

        if (result === "INSUFFICIENT_BALANCE") {
            return sendtscResponse(c, 400, action, 'error', 'TAKE_WITHDRAWALS', 'Saldo tidak mencukupi', 'Saldo tidak mencukupi untuk melakukan penarikan', undefined, 'INSUFFICIENT_BALANCE');
        }

        return sendtscResponse(c, 200, action, 'success', 'TAKE_WITHDRAWALS', 'Penarikan saldo berhasil diajukan', 'Penarikan saldo berhasil diajukan', undefined, 'WITHDRAWAL_SUCCESS');

    } catch (error) {
        console.error("Error di withdrawals-controller:", error);
        return sendtscResponse(c, 500, action, 'error', 'TAKE_WITHDRAWALS', 'Internal Server Error', 'Internal Server Error', undefined, 'INTERNAL_SERVER_ERROR');
    }
};