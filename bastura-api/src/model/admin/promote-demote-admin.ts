import { sql } from "../connection";

export const promoteUserToAdmin = async (id_user: string, id_admin: string) => {
    const result = await sql.begin(async (tx) => {
        // Find role_id for admin and user
        const role_admin = await tx`SELECT id_roles FROM roles WHERE roles = 'admin' LIMIT 1`;
        const role_user = await tx`SELECT id_roles FROM roles WHERE roles = 'user' LIMIT 1`;
        
        if (role_admin.length === 0 || role_user.length === 0) {
            throw new Error("ROLE_NOT_FOUND");
        }
        
        const adminRoleId = role_admin[0].id_roles;
        const userRoleId = role_user[0].id_roles;

        // Check target user
        const target = await tx`SELECT role_id, status_active FROM users WHERE id_users = ${id_user}`;
        if (target.length === 0) {
            return "USER_NOT_FOUND";
        }
        
        if (target[0].role_id === adminRoleId) {
            return "ALREADY_ADMIN";
        }
        
        if (target[0].role_id !== userRoleId) {
            return "TARGET_IS_NOT_USER";
        }
        
        if (target[0].status_active === 'blocked') {
            return "USER_BLOCKED";
        }

        // Promote
        const updateResult = await tx`
            UPDATE users 
            SET role_id = ${adminRoleId}, updated_at = now() 
            WHERE id_users = ${id_user} AND role_id = ${userRoleId} 
            RETURNING id_users, name, email, role_id
        `;

        if (updateResult.length === 0) {
            return "USER_NOT_FOUND"; // Or concurrent update
        }

        // Create audit log
        await tx`INSERT INTO audit_logs (actor_id, target_id, action_type, created_at) VALUES (${id_admin}, ${id_user}, 'PROMOTE_ADMIN', NOW())`;

        return { ...updateResult[0], role: 'admin' };
    });
    
    return result;
}

export const demoteAdminToUser = async (id_user: string, id_admin: string) => {
    const result = await sql.begin(async (tx) => {
        // Find role_id for admin and user
        const role_admin = await tx`SELECT id_roles FROM roles WHERE roles = 'admin' LIMIT 1`;
        const role_user = await tx`SELECT id_roles FROM roles WHERE roles = 'user' LIMIT 1`;
        
        if (role_admin.length === 0 || role_user.length === 0) {
            throw new Error("ROLE_NOT_FOUND");
        }
        
        const adminRoleId = role_admin[0].id_roles;
        const userRoleId = role_user[0].id_roles;

        // Check target user
        const target = await tx`SELECT role_id FROM users WHERE id_users = ${id_user}`;
        if (target.length === 0) {
            return "USER_NOT_FOUND";
        }

        if (target[0].role_id === userRoleId) {
            return "ALREADY_USER";
        }
        
        if (target[0].role_id !== adminRoleId) {
            return "TARGET_IS_NOT_ADMIN";
        }

        // Demote
        const updateResult = await tx`
            UPDATE users 
            SET role_id = ${userRoleId}, updated_at = now() 
            WHERE id_users = ${id_user} AND role_id = ${adminRoleId} 
            RETURNING id_users, name, email, role_id
        `;

        if (updateResult.length === 0) {
            return "USER_NOT_FOUND"; // Or concurrent update
        }

        // Create audit log
        await tx`INSERT INTO audit_logs (actor_id, target_id, action_type, created_at) VALUES (${id_admin}, ${id_user}, 'DEMOTE_ADMIN', NOW())`;

        return { ...updateResult[0], role: 'user' };
    });
    
    return result;
}
