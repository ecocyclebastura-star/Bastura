import { Context } from 'hono'
import { verify, sign } from 'hono/jwt'
import { findRefreshToken, deleteRefreshToken , updatetimeAccess } from '../../model/auth/token-models'
import { getUserById } from '../../model/auth/users-models' 
import { sendAuthResponse } from '../../logs/auth/auth-logs';
import { getEnvJWT } from '../middleware/env';

const JWT_SECRET = getEnvJWT.JWT_SECRET
const JWT_REFRESH_SECRET = getEnvJWT.JWT_REFRESH_SECRET

export const refreshToken = async (c: Context) => {
  try {
    
    const body = await c.req.json()
    const reqToken = body.refresh_token

    if (!reqToken) {
      return await sendAuthResponse(c, 400 , 'error', 'Token refresh error' , 'Refresh token tidak ditemukan' , 'Refresh token tidak ditemukan' , 'REFRESH_TOKEN_NOT_FOUND'   )
    }

    const tokenRecord = await findRefreshToken(reqToken)

    if (!tokenRecord) {
      deleteRefreshToken(reqToken).catch(console.error)
      return await sendAuthResponse(c, 403 , 'error', 'Token refresh error' , 'Terdeteksi aktivitas mencurigakan pada sesi Anda. Sesi telah diakhiri demi keamanan, silakan login ulang.' , 'Terdeteksi aktivitas mencurigakan pada sesi Anda. Sesi telah diakhiri demi keamanan, silakan login ulang.' , 'TOKEN_REVOKED_SECURITY_ALERT' )
    }

    let payload
    try {
      payload = await verify(reqToken, JWT_REFRESH_SECRET, 'HS256')
      updatetimeAccess(reqToken , new Date())    
    } catch (err) {
      deleteRefreshToken(reqToken).catch(console.error)
      return await sendAuthResponse(c, 403 , 'error', 'Token refresh error' , 'Refresh token invalid atau expired' , 'Refresh token invalid atau expired' , 'REFRESH_TOKEN_INVALID_OR_EXPIRED' )
    }

    const userId = payload.sub as string
    
    const user = await getUserById(userId)
    if (!user) {
      return await sendAuthResponse(c, 404 , 'error', 'Token refresh error' , 'User tidak ditemukan' , 'User tidak ditemukan' , 'USER_NOT_FOUND' )
    }
    
    const newAccessPayload = {
      sub: user.id,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (15 * 60) 
    }
    const new_access_token = await sign(newAccessPayload, JWT_SECRET)

    return await sendAuthResponse(c, 200 , 'success', 'Token refresh success' , 'Token berhasil diperbarui' , 'Token berhasil diperbarui' , {
      access_token: new_access_token, 
      expires_in: 900
    }
  ,'TOKEN_REFRESH_SUCCESS')
    
  } catch (error) {
    console.error('Refresh token error:', error)
    return await sendAuthResponse(c, 500 , 'error', 'Token refresh error' , 'Internal Server Error' , 'Internal Server Error' , 'INTERNAL_SERVER_ERROR' )
  }
}