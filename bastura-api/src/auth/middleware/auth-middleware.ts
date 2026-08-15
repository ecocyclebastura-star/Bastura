import {Context , Next} from 'hono'
import { verify } from 'hono/jwt'

const JWT_SECRET = process.env.JWT_SECRET


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

