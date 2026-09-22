import {Context , Next} from 'hono'
import { verify } from 'hono/jwt'
import { checkadmin } from '../../model/auth/users-models'


const JWT_SECRET = process.env.JWT_SECRET


export const adminOnly = async(c: Context , next : Next) => {
    const jwtPayload = c.get('jwtPayload') as any;
    const allowedRoles = [2, 3];
    if (!jwtPayload || !allowedRoles.includes(jwtPayload.role)) {
        return c.json({ status: 'error', message: 'Unauthorized: Sesi tidak valid' }, 401);
    }
    const sub = jwtPayload.sub as string;
    const check_admin = await checkadmin(sub);

    if(check_admin === "ACCESS_DENIED_UR_NOT_ADMIN") {
        return c.json({ status: 'error', message: 'Unauthorized: Sesi tidak valid' }, 401);
    }
    await next();   
}

export const userOnly = async(c: Context , next : Next) => {
    const jwtPayload = c.get('jwtPayload') as any;

    if (!jwtPayload || jwtPayload.role !== 1) {
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

export const checkAccessToken = async(c: Context , next : Next) => {
    const token = c.req.header('Authorization') as string;

    if (!token || !JWT_SECRET) {
        return c.json({ status: 'error', message: 'Token tidak ditemukan atau JWT_SECRET tidak terdefinisi' }, 401);
    }
    
    try {
        const jwtToken = token.split(' ')[1];
        const payload = await verify(jwtToken, JWT_SECRET , 'HS256');
        c.set('jwtPayload', payload);
    } catch (error) {
        return c.json({ status: 'error', message: 'Token tidak valid' }, 401);
    }
    await next();   
}


