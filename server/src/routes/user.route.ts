import { Router } from "express"
import { registerUser, loginUser, getApiKey, getCurrentUser, refreshAccessToken } from "../controllers/user.controller"
import { verifyJWT } from "../middlewares/auth.middleware"
const router = Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.get("/getApi", verifyJWT, getApiKey)
router.get("/getCurrentUser", verifyJWT, getCurrentUser);
router.post("/refresh-token", refreshAccessToken);
export default router
