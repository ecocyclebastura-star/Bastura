import { sql } from '../connection'

export const saveRefreshToken = async (userId: string, token: string, expiresAt: Date) => {
  await sql`
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `
}

export const findRefreshToken = async (token: string) => {
  const result = await sql`SELECT * FROM refresh_tokens WHERE token = ${token} LIMIT 1`
  return result.length > 0 ? result[0] : null
}

export const deleteRefreshToken = async (token: string) => {
  await sql`DELETE FROM refresh_tokens WHERE token = ${token}`
}
