import { Context } from "hono";
import { deleteUserData } from "../../model/profile/delete-user-data";
import { sendprofileResponse } from "../../logs/profile/profile-logs";
import { deleteUser } from "../type/profile-type";

export const deleteUserController = async (c : Context) => {
    const action = "deleteuser"

    try {
        const userpayload = c.get('jwtPayload') as deleteUser 
        if (!userpayload) {
            return sendprofileResponse(c, 401, 'DELETE_USER', 'error', action, 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID')
        } 

        const { sub } = userpayload

        const user = await deleteUserData(sub)

        if (!user || user.count === 0) {
            return sendprofileResponse(c, 404, 'DELETE_USER', 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        }

        return sendprofileResponse(c, 200, 'DELETE_USER', 'success', action, 'User berhasil dihapus', 'User berhasil dihapus', {data : user}, 'DELETE_USER_SUCCESS')
    } catch (error) {
        console.error("Error di delete-user:", error);
        return sendprofileResponse(c, 500, 'DELETE_USER', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}   