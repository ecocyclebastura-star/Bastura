import { getbalanceController } from "../controller/tsc-controller/get-balance";
import { getTransactionLogController } from "../controller/tsc-controller/transaction-log-controller";
import { takeWithdrawalsController } from "../controller/tsc-controller/wthdrawals-controller";
import { cancelWithdrawalsController } from "../controller/tsc-controller/cancel-withdrawals";
import { checkAccessToken } from "../auth/middleware/auth-middleware";
import { userOnly , adminOnly } from "../auth/middleware/auth-middleware";
import { getLogsAdminTscController } from "../controller/admin/get-tsclogs-admin-controller";
import { getTransactionLogsUserController } from "../controller/admin/get-tsc-logsUser-admin-controller";
import { verifty_wd } from "../controller/admin/verifty-wd-controller";
import { Hono } from "hono";
import { getVerifyWithdrawalController } from "../controller/admin/get-verifty-wd-controller";

const tscApp = new Hono()

// Hanya gunakan checkAccessToken secara global untuk mengecek login
tscApp.use('/*', checkAccessToken) 

// Terapkan userOnly secara eksplisit pada endpoint untuk user
tscApp.get('/balance', userOnly, getbalanceController)
tscApp.get('/transaction-log', userOnly, getTransactionLogController)
tscApp.post('/withdrawal', userOnly, takeWithdrawalsController)
tscApp.post('/withdrawal/cancel', userOnly, cancelWithdrawalsController)

// Endpoint admin tetap menggunakan adminOnly
tscApp.get('/transaction-logs/admin', adminOnly, getLogsAdminTscController)
tscApp.post('/transaction-logs/admin/user', adminOnly, getTransactionLogsUserController)
tscApp.get('/verify-withdrawal/admin', adminOnly, getVerifyWithdrawalController)
tscApp.post('/verify-withdrawal/admin',verifty_wd)

export default tscApp