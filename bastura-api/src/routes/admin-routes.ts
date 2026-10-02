import { Hono } from "hono";
import { checkAccessToken, superAdminOnly } from "../auth/middleware/auth-middleware";
import { promoteAdminController } from "../controller/admin/promote-admin-controller";
import { demoteAdminController } from "../controller/admin/demote-admin-controller";

export const adminApp = new Hono();

adminApp.use('/*', checkAccessToken)
adminApp.patch('/promote/:id_user', superAdminOnly, promoteAdminController)
adminApp.patch('/demote/:id_user', superAdminOnly, demoteAdminController)

export default adminApp
