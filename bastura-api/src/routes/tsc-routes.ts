import { getbalanceController } from "../controller/tsc-controller/get-balance";
import { getTransactionLogController } from "../controller/tsc-controller/transaction-log-controller";
import { takeWithdrawalsController } from "../controller/tsc-controller/wthdrawals-controller";
import { cancelWithdrawalsController } from "../controller/tsc-controller/cancel-withdrawals";
import { checkAccessToken } from "../auth/middleware/auth-middleware";
import { userOnly } from "../auth/middleware/auth-middleware";
import { Hono } from "hono";

const tscApp = new Hono()

tscApp.use('/*', checkAccessToken, userOnly)
tscApp.get('/balance', getbalanceController)
tscApp.get('/transaction-log', getTransactionLogController)
tscApp.post('/withdrawal', takeWithdrawalsController)
tscApp.post('/withdrawal/cancel', cancelWithdrawalsController)

export default tscApp
