import { Context } from "hono";
import { updateAddUserPhotoModel } from "../../model/profile/update-add-user-photo";
import { sendprofileResponse } from "../../logs/profile/profile-logs";
import { updateProfileImg } from "../type/profile-type";
import { getUserData } from "../../model/profile/get-user-data";
import path from 'node:path'

export const updateAddProfileImgController = async (c : Context) => {
    const action = "upload_or_add_profile_img"

    try {
        const userpayload = c.get('jwtPayload') as updateProfileImg
        const body = await c.req.parseBody()
        const avatar = body.avatar;

        if(!userpayload) {
            return sendprofileResponse(c, 401, 'UPLOAD_ADD_PROFILE_IMG', 'error', action, 'Token tidak valid', 'Token tidak valid', null, 'TOKEN_INVALID')
        }

        const { sub , name } = userpayload

        if(!avatar || typeof avatar === 'string') {
            return sendprofileResponse(c, 400, 'UPLOAD_ADD_PROFILE_IMG', 'error', action, 'Request body tidak valid', 'Request body tidak valid', null, 'REQUEST_INVALID')
        }   

        const avatartype = ['image/png', 'image/jpg', 'image/jpeg']

        if(!avatartype.includes(avatar.type)) {
            return sendprofileResponse(c, 400, 'UPLOAD_ADD_PROFILE_IMG', 'error', action, 'Tipe file tidak valid', 'Tipe file tidak valid', null, 'INVALID_FILE_TYPE')
        }

        const maxFileSize = 500 * 1024 // 500kb

        if (avatar instanceof File) {
            if (avatar.size > maxFileSize) {
                return sendprofileResponse(c, 400, 'UPLOAD_ADD_PROFILE_IMG', 'error', action, 'Ukuran file terlalu besar (maks 500KB)', 'Ukuran file tidak valid', null, 'INVALID_FILE_SIZE')
            }
        }

        const fileExt = path.extname(avatar.name);
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '');
        const createimagefilename = `profile-${safeName}-${Date.now()}${fileExt}`

        const dirpath = path.join(import.meta.dir, '..', '..', 'img', 'profile')
        const savepath = path.join(dirpath, createimagefilename)
        
        try {
            const arrayBuffer = await (avatar as File).arrayBuffer() 
            await Bun.write(savepath, arrayBuffer);
        } catch (err) {
            return sendprofileResponse(c, 500, 'UPLOAD_ADD_PROFILE_IMG', 'error', action, 'Gagal menyimpan gambar ke server', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR');
        }
   
        const result = await updateAddUserPhotoModel(sub, createimagefilename)
        if(!result || result.count === 0) {
            return sendprofileResponse(c, 404, 'UPLOAD_ADD_PROFILE_IMG', 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        }

        const getuser = await getUserData(sub)
        if(!getuser || getuser.length === 0) {
            return sendprofileResponse(c, 404, 'UPLOAD_ADD_PROFILE_IMG', 'error', action, 'User tidak ditemukan', 'User tidak ditemukan', null, 'USER_NOT_FOUND')
        }
        return sendprofileResponse(c, 200, 'UPLOAD_ADD_PROFILE_IMG', 'success', action, 'User berhasil diupdate', 'User berhasil diupdate', {data : getuser}, 'UPDATE_USER_SUCCESS')
    } catch (error) {
        console.error("Error di update-user:", error);
        return sendprofileResponse(c, 500, 'UPDATE_USER', 'error', action, 'Internal Server Error', 'Internal Server Error', null, 'INTERNAL_SERVER_ERROR')
    }
}