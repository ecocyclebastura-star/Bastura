import { Context } from 'hono'
import { verify, sign } from 'hono/jwt'
import { findRefreshToken, saveRefreshToken, deleteRefreshToken } from '../../model/auth/token-models'
import { getUserById } from '../../model/auth/users-models' 

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

export const refreshToken = async (c: Context) => {
  if(!JWT_SECRET || !JWT_REFRESH_SECRET) {
    return c.json({ status: 'error', message: 'JWT_SECRET atau JWT_REFRESH_SECRET tidak terdefinisi' }, 500)
  }
  try {
    const body = await c.req.json()
    const reqToken = body.refresh_token

    if (!reqToken) {
      return c.json({ status: 'error', message: 'Refresh token tidak ditemukan' }, 400)
    }

    const tokenRecord = await findRefreshToken(reqToken)

    if (!tokenRecord) {
      return c.json({
        status: 'error',
        code: 'TOKEN_REVOKED_SECURITY_ALERT',
        message: 'Terdeteksi aktivitas mencurigakan pada sesi Anda. Sesi telah diakhiri demi keamanan, silakan login ulang.'
      }, 403)
    }

    let payload
    try {
      payload = await verify(reqToken, JWT_REFRESH_SECRET, 'HS256')
    } catch (err) {
      deleteRefreshToken(reqToken).catch(console.error)
      return c.json({ status: 'error', message: 'Refresh token invalid atau expired' }, 403)
    }

    const userId = payload.sub as string
    
    const user = await getUserById(userId)
    if (!user) {
      return c.json({ status: 'error', message: 'User tidak ditemukan' }, 404)
    }
    
    const newAccessPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (5 * 60) 
    }
    const new_access_token = await sign(newAccessPayload, JWT_SECRET)

    const newRefreshPayload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) 
    }
    const new_refresh_token = await sign(newRefreshPayload, JWT_REFRESH_SECRET)
    
    deleteRefreshToken(reqToken).catch(console.error)
    
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)) 
    saveRefreshToken(user.id, new_refresh_token, expiresAt).catch(console.error)

    return c.json({
      status: 'success',
      message: 'Token berhasil diperbarui',
      data: {
        access_token: new_access_token,
        refresh_token: new_refresh_token, 
        expires_in: 300
      }
    }, 200)
  } catch (error) {
    console.error('Refresh token error:', error)
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500)
  }
}