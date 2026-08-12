// import { Context } from 'hono'
// import { AuthPayload } from './auth-type'
// import { getUserByEmailOrUsername, updatePasswordByEmail } from '../../model/auth/users-models'
// import { Resend } from 'resend'
// import bcrypt from 'bcryptjs'

// const resend = new Resend(process.env.RESEND_API_KEY)

// export const forgotPassword = async (c: Context) => {
//   try {
//     const body: AuthPayload = await c.req.json()

//     if (body.action !== 'FORGOT_PASSWORD') {
//       return c.json({ status: 'error', message: 'Invalid action' }, 400)
//     }

//     if (!body.email) {
//       return c.json({ status: 'error', message: 'Email harus diisi' }, 400)
//     }

//     const user = await getUserByEmailOrUsername(body.email)
    
//     if (!user) {
//       return c.json({ status: 'success', message: 'Instruksi reset password telah dikirim ke email Anda.' }, 200)
//     }
//     const randomPassword = Math.random().toString(36).slice(-8)
//     const hashedRandomPassword = await bcrypt.hash(randomPassword, 10)
//     await updatePasswordByEmail(user.email, hashedRandomPassword)
//     const { error } = await resend.emails.send({
//       from: 'System <onboarding@resend.dev>',
//       to: [user.email],
//       subject: 'Password Sementara Anda',
//       html: `
//         <div style="font-family: sans-serif; padding: 20px;">
//           <h2>Reset Password Berhasil</h2>
//           <p>Password sementara anda telah dibuat:</p>
//           <h2 style="color: #d9534f;">${randomPassword}</h2>
//           <p>Silakan login menggunakan password ini, lalu <b>segera ubah</b> di menu pengaturan password.</p>
//         </div>
//       `,
//     })

//     if (error) throw new Error('Email gagal dikirim')

//     return c.json({ status: 'success', message: 'Instruksi reset password telah dikirim ke email Anda.' }, 200)

//   } catch (error: any) {
//     console.error("Forgot Password Error:", error)
//     return c.json({ status: 'error', message: 'Terjadi kesalahan pada server' }, 500)
//   }
// }