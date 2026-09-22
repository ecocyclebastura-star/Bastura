import { Hono } from "hono";
import { login } from '../auth/global/login'
import { signup } from '../auth/global/signup'
import { logout } from '../auth/global/logout'
import { refreshToken } from '../auth/global/tk-refresh'
import { forgotpassword } from '../auth/global/forgotpass'
import { resetPassword } from '../auth/global/resetpass'
import { checkAccessToken } from "../auth/middleware/auth-middleware";
import { AccessTimer } from "../model/auth/database-cron-jobs";
import { startLogRotationJob } from "../auth/cron-jobs/delete-logs";

const authApp = new Hono()

AccessTimer();
startLogRotationJob();

authApp.post('/login', login ) 
authApp.post('/signup', signup)
authApp.post('/refresh', checkAccessToken, refreshToken)
authApp.post('/forgot-password', forgotpassword)
authApp.post('/reset-password', resetPassword)
authApp.post('/logout', checkAccessToken, logout)

export default authApp

