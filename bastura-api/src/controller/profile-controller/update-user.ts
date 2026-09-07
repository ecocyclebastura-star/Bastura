import { Context } from "hono";
import { updateUser } from "../type/profile-type";
import { updateUserData } from "../../model/profile/update-user-data";
import { sendprofileResponse } from "../../logs/profile/profile-logs";

export const updateuserController = async (c : Context) => {
    const action = "updateuser"

    try {
        const userpayload = c.get('jwtPayload') as updateUser
        if(!userpayload) {
            return sendprofileResponse(c, 401, 'UPDATE_USER', 'error', action, 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID')
        } 

        const { sub , name } = userpayload
        const body = await c.req.json() as updateUser
        const { new_name , new_phone } = body 

        if (!new_name && !new_phone) {
            return sendprofileResponse(c, 400, 'UPDATE_USER', 'error', action, 'Request body tidak valid', 'Request body tidak valid', null, 'REQUEST_INVALID')
        }
        
        const user = await updateUserData(sub, name, new_name, new_phone)

        console.log(user);
        

        if (!user || user.count === 0) {
            return sendprofileResponse(c, 404, 'UPDATE_USER', 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        }

        return sendprofileResponse(c, 200, 'UPDATE_USER', 'success', action, 'User berhasil diupdate', 'User berhasil diupdate', {data : user}, 'UPDATE_USER_SUCCESS')
    } catch (error) {
        console.error("Error di update-user:", error);
        return sendprofileResponse(c, 500, 'UPDATE_USER', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}   