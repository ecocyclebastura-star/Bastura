import { sql } from '../connection'

export const getUserByEmailOrUsername = async (identifier: string) => {
  const result = await sql`
    SELECT * FROM users 
    WHERE email = ${identifier} OR username = ${identifier} 
    LIMIT 1
  `
  return result.length > 0 ? result[0] : null
}

export const createUser = async (user: any) => {
  const result = await sql`
    INSERT INTO users (id, name, email, phone, password, created_at)
    VALUES (gen_random_uuid(), ${user.name}, ${user.email}, ${user.phone}, ${user.password}, NOW())
    RETURNING id, username, name, email, phone
  `
  return result[0]
}

export const getUserById = async (id: string) => {
  const result = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`
  return result.length > 0 ? result[0] : null
}

export const getPasswordByUserID = async (id: string) => {
  const result = await sql`SELECT password FROM users WHERE id = ${id} LIMIT 1`
  return result.length > 0 ? result[0].password : null
}

export const resetPassword = async (id: string, hashedPassword: string) => {
  const result = await sql`
    UPDATE users SET password = ${hashedPassword} WHERE id = ${id}
    RETURNING id, username, name, email, phone
  `
  return result[0]
} 

const updatePassword = async (id: string, hashedPassword: string) => {
  const result = await sql`
    UPDATE users SET password = ${hashedPassword} WHERE id = ${id}
    RETURNING id, username, name, email, phone
  `
  return result[0]
}

export const changeOldPassword = async (email: string, old_password: string , new_password: string) => {
  
  const user = await getUserByEmailOrUsername(email)
  if(!user) {
    throw new Error("user tidak di temukan")
  }
  
  const isPasswordValid = await Bun.password.verify(old_password, user.password)
  if(!isPasswordValid) {
    throw new Error("password lama tidak cocok")
  }

  const hashedPassword = await Bun.password.hash(new_password, {
    algorithm: "bcrypt",
    cost: 10,
  })
  
  const result = await updatePassword(user.id, hashedPassword)
  return result
}

export const updatePasswordByEmail = async (id: string, hashedPassword: string) => {
  const result = await sql`
    UPDATE users SET password = ${hashedPassword} WHERE email = ${id}
    RETURNING id, username, name, email, phone
  `
  return result[0]
}
  