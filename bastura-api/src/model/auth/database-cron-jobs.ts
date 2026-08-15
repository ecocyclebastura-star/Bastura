import { sql } from '../connection'

export const  AccessTimer = () => {
    setInterval(async() => {
    try {
        await sql`DELETE FROM refresh_tokens WHERE access_expired < now() - INTERVAL '15 minutes'`
    } catch (error) {
        console.error('Error Acces Token gagal dihapus dari database!', error)
    }
    }, 60000)
} 