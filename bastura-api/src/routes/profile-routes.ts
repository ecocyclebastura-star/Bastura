import { Hono } from "hono";
import { checkAccessToken } from "../auth/middleware/auth-middleware";
import { getuserController } from "../controller/profile-controller/get-user";
import { deleteUserController } from "../controller/profile-controller/delete-user";
import { updateAddProfileImgController } from "../controller/profile-controller/upload-add-profile-img";
import { updateuserController } from "../controller/profile-controller/update-user";
import { getProfilePhotoController } from "../controller/profile-controller/get-user-photo";
import { getAdminContactController } from "../controller/profile-controller/get-admin-contact";
import { changepassController } from "../controller/profile-controller/changepass";
import { get_warga_controller } from "../controller/users_data/get-warga-controller";
import { adminOnly } from "../auth/middleware/auth-middleware";
import { blockUserController } from "../controller/admin/block-users-controller";
import { unblockUserController } from "../controller/admin/unblock-users-controller";

export const profileApp = new Hono();

profileApp.use('/*', checkAccessToken)
profileApp.get('/profile',getuserController)
profileApp.get('/contact-info', getAdminContactController)
profileApp.patch('/profile',updateuserController)
profileApp.patch('/profile/deactive',deleteUserController)
profileApp.patch('/profile/changepass',changepassController)
profileApp.post('/profile/avatar',updateAddProfileImgController)
profileApp.get('/profile/avatar/:filename',getProfilePhotoController)
profileApp.get('/warga',adminOnly,get_warga_controller)
profileApp.patch('/warga/block/:id_user',adminOnly,blockUserController)
profileApp.patch('/warga/unblock/:id_user',adminOnly,unblockUserController)
export default profileApp