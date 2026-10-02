import { Context, Next } from 'hono';

export const superAdminGuard = async (c: Context, next: Next) => {
    const jwtPayload = c.get('jwtPayload') as any;

    // Super admin role_id is 3 based on roles table where roles = 'superadmin'
    if (!jwtPayload || jwtPayload.role !== 3) {
        return c.json({ status: 'error', message: 'Forbidden: Akses hanya untuk Super Admin' }, 403);
    }
    
    await next();
};
