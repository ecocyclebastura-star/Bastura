import { Hono } from "hono"
import { getAncPhotoController } from "../controller/anc-controller/get-anc-photo"
import { getAncController } from "../controller/anc-controller/get-anc"
import { getAncCategoriesController } from "../controller/anc-controller/get-anc-categories"
import { addAncController } from "../controller/anc-controller/add-anc-controller"
import { editAncController } from "../controller/anc-controller/edit-anc-controller"
import { deleteAncController } from "../controller/anc-controller/delete-anc-controller"
import { checkAccessToken, adminOnly } from "../auth/middleware/auth-middleware"

const ancApp = new Hono()

ancApp.use('/*', checkAccessToken)
ancApp.get('/', getAncController)
ancApp.get('/announcement-categories', getAncCategoriesController)
ancApp.get('/photo/:filename', getAncPhotoController)
ancApp.post('/', adminOnly, addAncController)
ancApp.patch('/:id', adminOnly, editAncController)
ancApp.delete('/:id', adminOnly, deleteAncController)

export default ancApp
