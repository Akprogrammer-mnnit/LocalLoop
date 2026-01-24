import { Router } from "express"
import { trafficController, } from "../controllers/handle.controller"
const router = Router()
router.all("/hook/:part1{/*rest}", trafficController);
export default router