import { Context } from 'hono'
import { sign } from 'hono/jwt'
import { createUser, getUserByEmail } from '../../model/auth/users-models'
import { saveRefreshToken } from '../../model/auth/token-models'
import { SignupPayload } from '../type/auth-type'
import { getEnvJWT } from '../middleware/env'
import { sendAuthResponse } from '../../logs/auth/auth-logs';

const { JWT_SECRET, JWT_REFRESH_SECRET } = getEnvJWT
let email : string | undefined;

export const signup = async (c: Context) => {
  try {
    const body: SignupPayload = await c.req.json()

    email = body.email

    if (!body.email || !body.password || !body.confirm_password) {
      return await sendAuthResponse(c, 400 , 'error', 'Signup error' ,'format tipe data invalid' , 'format tipe data invalid' , 'DATA_TYPE_INVALID' )
    }

    const hasnumber = /[0-9]/.test(body.password)

    if (!hasnumber){
      return await sendAuthResponse(c, 400 , 'error', 'Signup error' ,'password minimal 8 karakter dan mengandung angka' , 'password minimal 8 karakter dan mengandung angka' , 'PASSWORD_MIN_8_CHARACTER_AND_NUMBER' )
    }

    if (body.password.length < 8) {
      return await sendAuthResponse(c, 400 , 'error', 'Signup error' ,'password minimal 8 karakter ' , 'password minimal 8 karakter' , 'PASSWORD_MIN_8_CHARACTER' )
    }

    if (body.password !== body.confirm_password) {
      return await sendAuthResponse(c, 400 , 'error', 'Signup error' ,'Kata sandi tidak cocok dengan field konfirmasi kata sandi.' , 'Kata sandi tidak cocok dengan field konfirmasi kata sandi.' , 'PASSWORD_MISMATCH'  )
    }

    const existingUser = await getUserByEmail(body.email)
    if (existingUser) {
      return await sendAuthResponse(c, 409 , 'error', 'Signup error' ,'Email telah terdaftar' , 'Email telah terdaftar' , 'EMAIL_ALREADY_REGISTERED'  )
    }

    const hashedPassword = await Bun.password.hash(body.password, {
      algorithm: "bcrypt",
      cost: 10,
    })
    
    body.password = hashedPassword

    const newUser = await createUser(body)
    
    const payload = {
      sub: newUser.id,
      name: newUser.name,
      role: newUser.role,
      exp: Math.floor(Date.now() / 1000) + (15 * 60) 
    }
    
    const refreshPayload = {
      sub: newUser.id,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) 
    }
    
    const access_token = await sign(payload, JWT_SECRET)
    const refresh_token = await sign(refreshPayload, JWT_REFRESH_SECRET)

    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)) 
    saveRefreshToken(newUser.id, refresh_token, expiresAt).catch(console.error)

    return await sendAuthResponse(c, 200 , 'success', 'Signup success' , 'User berhasil mendaftar' , 'User berhasil mendaftar' ,
      {
        data:{
          data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email
        },
        tokens: {
          access_token,
          refresh_token,
          token_type: 'Bearer',
          expires_in: 900
        }
      }
        }
      } , 'SIGNUP_SUCCESS'  )

  } catch (error) {
    return await sendAuthResponse(c, 500 , 'error', 'Signup error' , 'Internal Server Error' , 'Internal Server Error' , 'INTERNAL_SERVER_ERROR'   )
  }
}