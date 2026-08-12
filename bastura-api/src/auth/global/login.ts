import { Context } from 'hono'
import { sign } from 'hono/jwt'
import { getUserByEmailOrUsername } from '../../model/auth/users-models'
import { saveRefreshToken } from '../../model/auth/token-models'
import { AuthPayload } from './auth-type'

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export const login = async (c: Context) => {
  if(!JWT_SECRET || !JWT_REFRESH_SECRET) {
    return c.json({ status: 'error', message: 'JWT_SECRET atau JWT_REFRESH_SECRET tidak terdefinisi' }, 500)
  }
  try {
    const body: AuthPayload = await c.req.json()
    
    if(body.action !== 'LOGIN') {
      return c.json({ status: 'error', message: 'Invalid action' }, 400)
    }
    const identifier = body.email || body.username 
    const password = body.password

    if (!identifier || !password) {
      return c.json({ status: 'error', message: 'Username/Email dan password harus diisi' }, 400)
    }

    const user = await getUserByEmailOrUsername(identifier)
    
    if (!user) {
      return c.json({ status: 'error', message: 'Username atau email belum terdaftar' }, 401)
    }

    const isMatch = await Bun.password.verify(password, user.password)

    if (!isMatch) {
      return c.json({ status: 'error', message: 'Username atau password salah' }, 401)
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (5 * 60) 
    }
    
    const refreshPayload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) 
    }

    const access_token = await sign(payload, JWT_SECRET!)
    const refresh_token = await sign(refreshPayload, JWT_REFRESH_SECRET!)

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    saveRefreshToken(user.id, refresh_token, expiresAt).catch(console.error) 

    return c.json({
      status: 'success',
      message: 'Login berhasil',
      data: {
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          email: user.email 
        },
        tokens: {
          access_token,
          refresh_token,
          token_type: 'Bearer',
          expires_in: 300
        }
      }
    }, 200)
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500)
  }
}
