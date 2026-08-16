import { Context } from 'hono'
import { sign } from 'hono/jwt'
import { getUserByEmail } from '../../model/auth/users-models'
import { saveRefreshToken } from '../../model/auth/token-models'
import { LoginPayload } from '../type/auth-type'
import { getEnvJWT } from '../middleware/env'
import { sendAuthResponse } from '../../logs/auth/auth-logs'

const JWT_SECRET = getEnvJWT.JWT_SECRET
const JWT_REFRESH_SECRET = getEnvJWT.JWT_REFRESH_SECRET

export const login = async (c: Context) => {

  try {
    const body: LoginPayload = await c.req.json()
    const identifier = body.email 
    const password = body.password

    if (!identifier || !password) {
      return await sendAuthResponse(c, 400 , 'error' , 'Login Error ' , 'Email dan Password harus diisi ' , 'Email dan Password harus diisi ' , 'EMAIL_PASSWORD_REQUIRED'  )
    }

    const user = await getUserByEmail(identifier)
    
    if (!user) {
      return await sendAuthResponse(c, 401 , 'error' , 'Login Error ' , 'Email belum terdaftar' , 'Email belum terdaftar' , 'EMAIL_NOT_FOUND'  )
    }

    const isMatch = await Bun.password.verify(password, user.password)

    if (!isMatch) {
      return await sendAuthResponse(c, 401 , 'error' , 'Login Error ' , 'Email atau password salah' , 'Email atau password salah' , 'EMAIL_PASSWORD_WRONG'  )
    }

    const payload = {
      sub: user.id,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (15 * 60) 
    }
    
    const refreshPayload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) 
    }

    const access_token = await sign(payload, JWT_SECRET)
    const refresh_token = await sign(refreshPayload, JWT_REFRESH_SECRET)

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    saveRefreshToken(user.id, refresh_token, expiresAt).catch(console.error) 

    return await sendAuthResponse(c, 200 , 'success' , 'Login Success ' , `User ${user.email} berhasil login` , `User ${user.email} berhasil login` , 
      {
        user: {
          id: user.id, 
          name: user.name, 
          email: user.email 
        },
        tokens: {
          access_token,
          refresh_token,
          token_type: 'Bearer',
          expires_in: 900
        }
      }
      ,'LOGIN_SUCCESS'  )

  } catch (error) {
    return await sendAuthResponse(c, 500 , 'error' , 'Login Error ' , 'Internal Server Error' , 'Internal Server Error' , 'INTERNAL_SERVER_ERROR'   )
  }
}
