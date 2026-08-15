import { Context } from "hono";
import { ChangePasswordPayload } from "../../auth/type/auth-type"; 
import { changeOldPassword } from "../../model/auth/users-models"; 

export const changePassword = async (c: Context) => {
  try {
    const body: ChangePasswordPayload = await c.req.json();

    if (body.new_password.length < 8) {
        return c.json({ status: 'error', message: 'Password minimal 8 karakter' }, 400);
    }
    
    if (body.new_password !== body.confirm_password) {
        return c.json({ status: 'error', message: 'Password dan confirm password tidak sama' }, 400);
    }

    const jwtPayload = c.get('jwtPayload') as { email: string };
    const userEmail = jwtPayload?.email; 

    if (!userEmail) {
      return c.json({ status: 'error', message: 'Unauthorized: Sesi tidak valid' }, 401);
    }

    const updatedUser = await changeOldPassword(
      userEmail, 
      body.old_password, 
      body.new_password
    );

    return c.json({ 
      status: 'success', 
      message: 'Password berhasil diubah',
      data: updatedUser 
    }, 200);

  } catch (error: any) {
    if (error.message === "user tidak di temukan") {
      return c.json({ status: 'error', message: 'User tidak ditemukan' }, 404);
    }
    
    if (error.message === "password lama tidak cocok") {
      return c.json({ status: 'error', message: 'Password lama tidak sesuai' }, 400);
    }

    console.error("Change Password Error:", error);
    return c.json({ status: 'error', message: 'Terjadi kesalahan pada server' }, 500);
  }
}