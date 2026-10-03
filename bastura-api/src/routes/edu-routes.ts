import { Hono } from "hono"
import { checkAccessToken } from "../auth/middleware/auth-middleware"
import { getEduController } from "../controller/edu-controller/get-edu"
import { getEduPhotoController } from "../controller/edu-controller/get-edu-photo"
import { getAdminEduController } from "../controller/edu-controller/get-admin-edu-controller"
import { addEduController } from "../controller/edu-controller/add-edu-controller"
import { editEduController } from "../controller/edu-controller/edit-edu-controller"
import { deleteEduController } from "../controller/edu-controller/delete-edu-controller"
import { uploadEduImgController } from "../controller/edu-controller/upload-edu-img-controller"

const eduApp = new Hono()

eduApp.use('/*', checkAccessToken)
eduApp.get('/', getEduController)
eduApp.get('/admin', getAdminEduController)
eduApp.get('/photo/:filename', getEduPhotoController)
eduApp.post('/', addEduController)
eduApp.patch('/:id', editEduController)
eduApp.delete('/:id', deleteEduController)
eduApp.post('/photo/:id', uploadEduImgController)

export default eduApp