import {Context , Next} from 'hono'

export const adminOnly = async(c: Context , next : Next) => {
    const jwtPayload = c.get('jwtPayload') as any;

    if (!jwtPayload || jwtPayload.role !== 'admin') {
        return c.json({ status: 'error', message: 'Unauthorized: Sesi tidak valid' }, 401);
    }
    await next();   
}

export const userOnly = async(c: Context , next : Next) => {
    const jwtPayload = c.get('jwtPayload') as any;

    if (!jwtPayload || jwtPayload.role !== 'user') {
        return c.json({ status: 'error', message: 'Unauthorized: Sesi tidak valid' }, 401);
    }
    await next();   
}   

export const superAdminOnly = async(c: Context , next : Next) => {
    const jwtPayload = c.get('jwtPayload') as any;

    if (!jwtPayload || jwtPayload.role !== 'superadmin') {
        return c.json({ status: 'error', message: 'Unauthorized: Sesi tidak valid' }, 401);
    }
    await next();   
}   