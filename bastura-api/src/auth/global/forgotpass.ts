import { Context } from 'hono'
import { createHmac, randomInt } from 'node:crypto'
import { Resend } from 'resend'
import { getUserByEmail } from '../../model/auth/users-models'
import { ForgotPasswordPayload } from '../type/auth-type'
import { sendAuthResponse } from "../../logs/auth/auth-logs";
import { getEnvOTP } from '../middleware/env';

const resend = new Resend(getEnvOTP.RESEND_API_KEY)
const OTP_SECRET = getEnvOTP.OTP_SECRET
const FROM_EMAIL = getEnvOTP.RESEND_FROM_EMAIL || 'Bastura <noreply@api.basturaapp.my.id>'

export const forgotpassword = async (c: Context ) => {
  let email : string | undefined;

  try {
    const body: ForgotPasswordPayload = await c.req.json()
    email = body.email
    if (!email){
      return await sendAuthResponse(
        c, 400 , 'error' , 'Email tidak ditemukan' , 'Email tidak ditemukan' , 'Email gagal ditemukan didalam server' , null, 'EMAIL_NOT_FOUND'  
      ) 
    }

    if (!email.includes("@") || !email.includes(".")){
      return await sendAuthResponse(
        c, 400 , 'error' , 'Format Email tidak sesuai , Mohon diinput ulang' , 'Format Email tidak sesuai' , 'Format Email tidak sesuai' , null, 'EMAIL_FORMAT_INVALID'  
      )
    }

    const user = await getUserByEmail(email)
    
    const expiresAt = Date.now() + 15 * 60 * 1000

    if (!user) {
      const fakeHash = createHmac('sha256', OTP_SECRET ).update(`fake.${Date.now()}`).digest('hex')
      return await sendAuthResponse(
        c, 200 , 'success' , 'OTP terkirim' , 'Jika email terdaftar, OTP 6-digit telah dikirim ke email Anda.' , 'Jika email terdaftar, OTP 6-digit telah dikirim ke email Anda.' 
        , {
          hash : fakeHash,
          expiresAt : expiresAt
        }, 'OTP_SENT'
      )
    }

    // Generate 6 digit OTP (100000 - 999999) yang cryptographically secure
    const otp = randomInt(100000, 1000000).toString();
    
    const dataToHash = `${user.email}.${otp}.${expiresAt}`

    const hash = createHmac('sha256', OTP_SECRET).update(dataToHash).digest('hex')

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [user.email],
      subject: 'Kode OTP Reset Password Anda',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <p>Halo ${user.name || 'Pengguna Bastura'},</p>
          <h2>Permintaan Reset Password</h2>
          <p>Kode OTP Anda adalah:</p>
          <h1 style="color: #106d09ff; letter-spacing: 3px;">${otp}</h1>
          <p>Kode ini berlaku selama 15 menit. <b>Jangan berikan kode ini kepada siapapun!</b></p>
          <p>Hormat kami, <br> Tim Bastura</p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend send email error:', error)
      throw new Error(`Email gagal dikirim: ${error.message}`)
    }
    
    return await sendAuthResponse(
      c, 200 , 'success' , 'OTP terkirim' , 'Jika email terdaftar, OTP 6-digit telah dikirim ke email Anda.' , 'Jika email terdaftar, OTP 6-digit telah dikirim ke email Anda.' 
      , {
        hash : hash,
        expiresAt : expiresAt
      }, 'OTP_SENT'
    );
    
  } catch (error) {
    console.error('Forgot password error:', error)
    return await sendAuthResponse(
      c, 500 , 'error' , 'Internal Server Error' , 'Terjadi kesalahan pada server' , 'Terjadi kesalahan pada server' , null, 'INTERNAL_SERVER_ERROR'  
    )
  }
}
    
