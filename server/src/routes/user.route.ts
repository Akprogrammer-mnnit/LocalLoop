import {Router} from "express"
import {registerUser,loginUser} from "../controllers/user.controller"
const router = Router()

router.post("/register",registerUser)
router.post("/login",loginUser)


export default router
