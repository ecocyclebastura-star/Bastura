import { Context } from "hono";
import { createHmac } from "node:crypto";
import bcrypt from 'bcryptjs';
import { updatePasswordByEmail } from "../../model/auth/users-models";
import { ResetPasswordPayload } from "../type/auth-type";
import { getEnvOTP } from "../middleware/env";
import {  sendAuthResponse } from "../../logs/auth/auth-logs";  

const OTP_SECRET = getEnvOTP.OTP_SECRET
let email : string | undefined;

export const resetPassword = async (c: Context) => {
  try {
    const body: ResetPasswordPayload = await c.req.json()
    email = body.email

    if (!body.email || !body.otp || !body.new_password || !body.hash || !body.expiresAt) {
      return await sendAuthResponse(c, 400, 'error', 'Reset Password Error' , 'Data tidak lengkap' , 'Data tidak lengkap' , 'DATA_INCOMPLETE'  )
    }

    if (Date.now() > body.expiresAt) {
      return await sendAuthResponse(c ,400 , 'error', 'Kode OTP Kadaluarsa' , 'Kode OTP sudah kadaluarsa' , 'Kode OTP sudah kadaluarsa' , 'OTP_EXPIRED' )
    }

    const hasnumber = /[0-9]/.test(body.new_password)
    if (!hasnumber){
      return await sendAuthResponse(c, 400 , 'error', 'Reset Password Error' , 'password minimal 8 karakter dan mengandung angka' , 'password minimal 8 karakter dan mengandung angka' , 'PASSWORD_MIN_8_CHARACTER_AND_NUMBER' )
    }

    if (body.new_password.length < 8) {
      return await sendAuthResponse(c, 400 , 'error', 'Reset Password Error' , 'password minimal 8 karakter' , 'password minimal 8 karakter' , 'PASSWORD_MIN_8_CHARACTER' )
    }

    const dataToHash = `${body.email}.${body.otp}.${body.expiresAt}`
    const calculatedHash = createHmac('sha256', OTP_SECRET).update(dataToHash).digest('hex')

    if (calculatedHash !== body.hash) {
      return await sendAuthResponse(c, 400 , 'error', 'Kode OTP salah' , 'Kode OTP salah' , 'KODE_OTP_INCORRECT' )
    }
    const hashedNewPassword = await bcrypt.hash(body.new_password, 10)
    await updatePasswordByEmail(body.email, hashedNewPassword)

    return await sendAuthResponse(c, 200 , 'success', 'Password berhasil diubah' , 'Password berhasil diubah , Silahkan login kembali', 'PASSWORD_RESET_SUCCESS' )

  } catch (error: any) {  
    console.error("Reset Password Error:", error)
    return await sendAuthResponse(c, 500 , 'error', 'Internal Server Error' , 'Terjadi kesalahan pada server' , 'INTERNAL_SERVER_ERROR' )
  }
}