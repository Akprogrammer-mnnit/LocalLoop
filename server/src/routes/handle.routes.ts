import {Router} from "express"
import {trafficController,} from "../controllers/handle.controller"
import {requestHistory} from "../app"
const router = Router()

router.all('/hook/:id/:subdomain/*path', trafficController)
router.all('/hook/:id/:subdomain', trafficController)

export default router