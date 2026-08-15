import { sql } from '../connection'

export const saveRefreshToken = async (userId: string, token: string, expiresAt: Date) => {
  await sql`
    INSERT INTO refresh_tokens (id_token, user_id, token, expires_at , created_at , access_expired)
    VALUES (gen_random_uuid(), ${userId}, ${token}, ${expiresAt} , now() , now())
  `
}

export const findRefreshToken = async (token: string) => {
  const result = await sql`SELECT * FROM refresh_tokens WHERE token = ${token} LIMIT 1`
  return result.length > 0 ? result[0] : null
}

export const updatetimeAccess = async (token:string , expires:Date) => {
  await sql`UPDATE refresh_tokens SET access_expired = ${expires} WHERE token = ${token}`
}

export const deleteRefreshToken = async (token: string) => {
  console.log("Mencoba menghapus token:", token);
  
  const result = await sql`
    DELETE FROM refresh_tokens 
    WHERE token = ${token} 
    RETURNING *
  `;
  
  console.log("Hasil eksekusi DELETE (jumlah baris terhapus):", result.length);
  return result;
}
