import { Context } from "hono";
import { getUser } from "../type/profile-type";
import { getUserData } from "../../model/profile/get-user-data";
import { sendprofileResponse } from "../../logs/profile/profile-logs";

export const getuserController = async (c : Context) => {
    const action  = "getuser"

    try {
        const userpayload = c.get('jwtPayload') as getUser 
        if (!userpayload) {
            return sendprofileResponse(c, 401, 'GET_USER', 'error', action, 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID')
        } 

        const { sub } = userpayload

        const user = await getUserData(sub)

        if (!user || user.length === 0) {
            return sendprofileResponse(c, 404, 'GET_USER', 'error', action, 'User not found', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        } 

        return sendprofileResponse(c, 200, 'GET_USER', 'success', action, 'User berhasil diambil', 'User berhasil diambil', {data : user}, 'GET_USER_SUCCESS')
        
    } catch (error) {
        console.error("Error di get-user:", error);
        return sendprofileResponse(c, 500, 'GET_USER', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
    
}
