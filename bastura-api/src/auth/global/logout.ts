import { Context } from 'hono'
import { deleteRefreshToken } from '../../model/auth/token-models'
import { AuthPayload } from './auth-type';

export const logout = async (c: Context) => {
  try {
    const body: AuthPayload = await c.req.json()
    
    if(body.action !== 'LOGOUT') {
      return c.json({ status: 'error', message: 'Invalid action' }, 400)
    }

    const reqToken = body.rf_token
    
    if (reqToken) {
      deleteRefreshToken(reqToken).catch(console.error)
    }

    return c.json({
      status: 'success',
      message: 'User berhasil logout'
    }, 200)
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500)
  }
}
