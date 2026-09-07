import { Hono } from "hono"
import { getEduPhotoController } from "../controller/edu-controller/get-edu-photo"
import { getEduController } from "../controller/edu-controller/get-edu"
import { checkAccessToken } from "../auth/middleware/auth-middleware"

const eduApp = new Hono()

eduApp.use('/*', checkAccessToken)
eduApp.get('/education', getEduController)
eduApp.get('/education/photo/:filename', getEduPhotoController)

export default eduApp