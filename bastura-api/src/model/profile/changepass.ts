import { sql } from "../connection"

export const changepass = async (sub: string, old_password: string, new_password: string) => {
    try {
        const result = await sql.begin(async (tx) => {

            // 1. Cek user aktif dan ambil password lama
            const [user] = await tx`
                SELECT id_users, password
                FROM users
                WHERE id_users = ${sub}
                  AND status_active = 'active'
                  AND deleted_at IS NULL
                LIMIT 1
            `

            if (!user) {
                return { error: "USER_NOT_FOUND" }
            }

            // 2. Verifikasi password lama
            const isPasswordValid = await Bun.password.verify(old_password, user.password)
            if (!isPasswordValid) {
                return { error: "INVALID_OLD_PASSWORD" }
            }

            // 3. Hash password baru
            const hashedPassword = await Bun.password.hash(new_password, {
                algorithm: "bcrypt",
                cost: 10,
            })

            // 4. Update password di tabel users (sesuai schema: kolom updated_at)
            const [updated] = await tx`
                UPDATE users
                SET password   = ${hashedPassword},
                    updated_at = now()
                WHERE id_users = ${sub}
                RETURNING id_users, name, email, phone
            `

            // 5. Catat ke update_logs (sesuai pattern proyek)
            await tx`
                UPDATE update_logs
                SET profile_up = now()
                WHERE id_update = 1
            `

            return updated
        })

        return result
    } catch (error) {
        console.error("Error changing password:", error)
        throw error
    }
}