import {Router} from "express"
import {trafficController} from "../controllers/handle.controller"
const router = Router()

router.all('/hook/:subdomain/*path', trafficController)
router.all('/hook/:subdomain', trafficController)

export default router