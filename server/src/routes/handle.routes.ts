import {Router} from "express"
import {trafficController,} from "../controllers/handle.controller"
import {requestHistory} from "../app"
const router = Router()

// router.all('/hook/:subdomain/*path', trafficController)
// router.all('/hook/:subdomain', trafficController)

router.all("/hook/:part1/*rest", trafficController);
export default router