import { Context } from 'hono'
import { sign } from 'hono/jwt'
import { createUser, getUserByEmailOrUsername } from '../../model/auth/users-models'
import { saveRefreshToken } from '../../model/auth/token-models'
import { AuthPayload } from './auth-type'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export const signup = async (c: Context) => {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    return c.json({ status: 'error', message: 'JWT_SECRET atau JWT_REFRESH_SECRET tidak terdefinisi' }, 500)
  }
  
  try {
    const body: AuthPayload = await c.req.json()

    if (body.action !== 'SIGNUP') {
      return c.json({ status: 'error', message: 'Invalid action' }, 400)
    }

    if (!body.email || !body.password || !body.confirm_password) {
      return c.json({ status: 'error', message: 'Format tipe data invalid' }, 400)
    }

    if (body.password !== body.confirm_password) {
      return c.json({ status: 'error', message: 'Kata sandi tidak cocok dengan field konfirmasi kata sandi.' }, 400)
    }

    const existingUser = await getUserByEmailOrUsername(body.email)
    if (existingUser) {
      return c.json({ status: 'error', message: 'username dan email telah terdaftar' }, 409)
    }

    const hashedPassword = await Bun.password.hash(body.password, {
      algorithm: "bcrypt",
      cost: 10,
    })
    
    body.password = hashedPassword

    const newUser = await createUser(body)
    
    const payload = {
      sub: newUser.id,
      username: newUser.username,
      role: newUser.role || 'user',
      exp: Math.floor(Date.now() / 1000) + (5 * 60) 
    }
    
    const refreshPayload = {
      sub: newUser.id,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) 
    }
    
    const access_token = await sign(payload, JWT_SECRET)
    const refresh_token = await sign(refreshPayload, JWT_REFRESH_SECRET)

    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)) 
    saveRefreshToken(newUser.id, refresh_token, expiresAt).catch(console.error)

    return c.json({
      status: 'success',
      message: 'Registrasi berhasil', 
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
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
    console.error('Signup error:', error)
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500)
  }
}