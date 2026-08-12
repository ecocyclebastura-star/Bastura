import { Hono } from "hono";
import { jwt } from 'hono/jwt'
import { login } from '../auth/global/login'
import { signup } from '../auth/global/signup'
import { logout } from '../auth/global/logout'
import { refreshToken } from '../auth/global/tk-refresh'
// import { forgotPassword } from '../auth/global/forgotpass'
import { changePassword } from '../auth/global/chagepass'
import { userOnly } from '../auth/global/auth-middleware'

const authApp = new Hono()
const JWT_SECRET = process.env.JWT_SECRET!
const verifyJwt = jwt({ secret: JWT_SECRET, alg: 'HS256' })

authApp.post('/login', login)
authApp.post('/signup', signup)
authApp.post('/refresh', refreshToken)
// authApp.post('/forgot-password', forgotPassword)
// authApp.post('/forgot-password/:id', forgotPassword)
authApp.post('/change-password', verifyJwt, userOnly, changePassword)
authApp.post('/logout', verifyJwt, logout)

export default authApp