import { Hono } from "hono";
import { checkAccessToken } from "../auth/middleware/auth-middleware";
import { getuserController } from "../controller/profile-controller/get-user";
import { deleteUserController } from "../controller/profile-controller/delete-user";
import { updateAddProfileImgController } from "../controller/profile-controller/upload-add-profile-img";
import { updateuserController } from "../controller/profile-controller/update-user";
import { getProfilePhotoController } from "../controller/profile-controller/get-user-photo";
import { getAdminContactController } from "../controller/profile-controller/get-admin-contact";
import { changepassController } from "../controller/profile-controller/changepass";

export const profileApp = new Hono();

profileApp.use('/*', checkAccessToken)
profileApp.get('/profile',getuserController)
profileApp.get('/contact-info', getAdminContactController)
profileApp.patch('/profile',updateuserController)
profileApp.patch('/profile/deactive',deleteUserController)
profileApp.patch('/profile/changepass',changepassController)
profileApp.post('/profile/avatar',updateAddProfileImgController)
profileApp.get('/profile/avatar/:filename',getProfilePhotoController)

export default profileApp