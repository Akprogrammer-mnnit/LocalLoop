import {Router} from "express"
import {verifyJWT} from "../middlewares/auth.middleware"
import { getHistory,getMySubdomains } from "../controllers/api.controller";

const router = Router()

router.get("/history/:subdomain",verifyJWT, getHistory);
router.get("/getMySubdomains",verifyJWT,getMySubdomains);

export default router