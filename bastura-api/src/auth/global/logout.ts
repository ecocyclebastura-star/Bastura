import { Context } from 'hono'
import { verify } from 'hono/jwt';
import { deleteRefreshToken } from '../../model/auth/token-models'
import { LogoutPayload } from '../type/auth-type';
import { getEnvJWT } from '../middleware/env'
import { sendAuthResponse } from '../../logs/auth/auth-logs'

const JWT_REFRESH_SECRET = getEnvJWT.JWT_REFRESH_SECRET

export const logout = async (c: Context) => {
  try {
    const body: LogoutPayload = await c.req.json()
    const reqToken = body.rf_token

    if (!reqToken) {
      return await sendAuthResponse(c, 400 , 'error' , 'Logout Error ' , 'Refresh token tidak ditemukan' , 'Refresh token tidak ditemukan' , 'REFRESH_TOKEN_NOT_FOUND'  )
    }

    const decodedToken = await verify(reqToken , JWT_REFRESH_SECRET , 'HS256')

    const userId = decodedToken.sub

    if (reqToken) {
      await deleteRefreshToken(reqToken).catch(console.error)
    }

    await sendAuthResponse(c, 200 , 'success' , 'Logout Success ' , `User ${userId} berhasil logout` , `User ${userId} berhasil logout` , {})

  } catch (error) {

    await sendAuthResponse(c, 500 , 'error' , 'Logout Error ' , 'Internal Server Error' , 'Internal Server Error' , 'INTERNAL_SERVER_ERROR'   )
    
  }
}
