import { Context } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { updatePasswordByEmail } from "../../model/auth/users-models";
import { ResetPasswordPayload } from "../type/auth-type";
import { getEnvOTP } from "../middleware/env";
import { sendAuthResponse } from "../../logs/auth/auth-logs";  

const OTP_SECRET = getEnvOTP.OTP_SECRET

export const resetPassword = async (c: Context) => {
  try {
    const body: ResetPasswordPayload = await c.req.json()

    if (!body.email || !body.otp || !body.new_password || !body.hash || !body.expiresAt) {
      return await sendAuthResponse(c, 400, 'error', 'Reset Password Error', 'Data tidak lengkap', 'Data tidak lengkap', null, 'DATA_INCOMPLETE')
    }

    if (Date.now() > body.expiresAt) {
      return await sendAuthResponse(c, 400, 'error', 'Kode OTP Kadaluarsa', 'Kode OTP sudah kadaluarsa', 'Kode OTP sudah kadaluarsa', null, 'OTP_EXPIRED')
    }

    if (body.new_password.length < 8) {
      return await sendAuthResponse(c, 400, 'error', 'Reset Password Error', 'Password minimal 8 karakter', 'Password minimal 8 karakter', null, 'PASSWORD_MIN_8_CHARACTER')
    }

    const hasNumber = /[0-9]/.test(body.new_password)
    if (!hasNumber) {
      return await sendAuthResponse(c, 400, 'error', 'Reset Password Error', 'Password minimal 8 karakter dan mengandung angka', 'Password minimal 8 karakter dan mengandung angka', null, 'PASSWORD_MIN_8_CHARACTER_AND_NUMBER')
    }

    const dataToHash = `${body.email}.${body.otp}.${body.expiresAt}`
    const calculatedHash = createHmac('sha256', OTP_SECRET).update(dataToHash).digest('hex')

    const calculatedBuffer = Buffer.from(calculatedHash)
    const clientHashBuffer = Buffer.from(body.hash)

    if (calculatedBuffer.length !== clientHashBuffer.length || !timingSafeEqual(calculatedBuffer, clientHashBuffer)) {
      return await sendAuthResponse(c, 400, 'error', 'Kode OTP salah', 'Kode OTP salah atau tidak valid', 'Kode OTP salah atau tidak valid', null, 'KODE_OTP_INCORRECT')
    }

    const hashedNewPassword = await Bun.password.hash(body.new_password, {
      algorithm: "bcrypt",
      cost: 10,
    })

    const updatedUser = await updatePasswordByEmail(body.email, hashedNewPassword)
    if (!updatedUser) {
      return await sendAuthResponse(c, 404, 'error', 'Reset Password Error', 'User tidak ditemukan', 'User tidak ditemukan atau email tidak terdaftar', null, 'USER_NOT_FOUND')
    }

    return await sendAuthResponse(c, 200, 'success', 'Password berhasil diubah', 'Password berhasil diubah', 'Password berhasil diubah, silakan login kembali.', null, 'PASSWORD_RESET_SUCCESS')

  } catch (error: any) {  
    console.error("Reset Password Error:", error)
    return await sendAuthResponse(c, 500, 'error', 'Internal Server Error', 'Terjadi kesalahan pada server', 'Terjadi kesalahan pada server', null, 'INTERNAL_SERVER_ERROR')
  }
}