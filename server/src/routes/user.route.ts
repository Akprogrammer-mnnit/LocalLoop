import {Router} from "express"
import {registerUser,loginUser,getApiKey,getCurrentUser} from "../controllers/user.controller"
import {verifyJWT} from "../middlewares/auth.middleware"
const router = Router()

router.post("/register",registerUser)
router.post("/login",loginUser)
router.get("/getApi/:userId",verifyJWT,getApiKey)
router.get("/getCurrentUser",verifyJWT,getCurrentUser);
export default router
