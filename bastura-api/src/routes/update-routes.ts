import { Hono } from "hono"
import { getUpdateController } from "../controller/update-controller/get-update"
import { adminOnly, checkAccessToken } from "../auth/middleware/auth-middleware"
import { insert_setoran_controller } from "../controller/update-controller/insert-jadwal"

const updateApp = new Hono()

// Endpoint: GET /api/v1/updates
updateApp.use('/*', checkAccessToken)
updateApp.get('/', getUpdateController)
updateApp.post('/insert-setoran', insert_setoran_controller , adminOnly  )

export default updateApp
 