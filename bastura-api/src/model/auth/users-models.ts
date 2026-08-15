import { sql } from '../connection'

export const getUserByEmail = async (identifier: string) => {
  const result = await sql`
    SELECT 
      u.id_users as id,
      u.email,
      u.password,
      u.name,
      u.phone,
      u.roles as role
    WHERE u.email = ${identifier}
    LIMIT 1
  `
  return result.length > 0 ? result[0] : null
}

export const createUser = async (user: any) => {
  const result = await sql`
    INSERT INTO users (id_users, name, email, phone, password,role_id, created_at)
    VALUES (gen_random_uuid(), ${user.name}, ${user.email}, ${user.phone}, ${user.password},1, NOW())
    RETURNING id_users as id, name, email, phone, role_id as role
  `
  return result[0]
}

export const getUserById = async (id: string) => {
  const result = await sql`
    SELECT 
      u.id_users as id,
      u.email,
      u.name,
      u.phone,
      r.roles as role
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id_roles
    WHERE u.id_users = ${id}
    LIMIT 1
  `
  return result.length > 0 ? result[0] : null
}

export const getPasswordByUserID = async (id: string) => {
  const result = await sql`SELECT password FROM users WHERE id_users = ${id} LIMIT 1`
  return result.length > 0 ? result[0].password : null
}

export const resetPassword = async (id: string, hashedPassword: string) => {
  const result = await sql`
    UPDATE users SET password = ${hashedPassword} WHERE id_users = ${id}
    RETURNING id_users, name, email, phone
  `
  return result[0]
} 

const updatePassword = async (id: string, hashedPassword: string) => {
  const result = await sql`
    UPDATE users SET password = ${hashedPassword} WHERE id_users = ${id}
    RETURNING id_users, name, email, phone
  `
  return result[0]
}

export const changeOldPassword = async (email: string, old_password: string , new_password: string) => {
  
  const user = await getUserByEmail(email)
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
    RETURNING id_users, name, email, phone
  `
  return result[0]
}
 