import { Hono } from "hono"
import { getAncPhotoController } from "../controller/anc-controller/get-anc-photo"
import {getAncController} from "../controller/anc-controller/get-anc"
import { checkAccessToken } from "../auth/middleware/auth-middleware"

const ancApp = new Hono()

ancApp.use('/*', checkAccessToken)
ancApp.get('/', getAncController)
ancApp.get('/photo/:filename', getAncPhotoController)

export default ancApp
