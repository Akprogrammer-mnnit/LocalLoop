import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getApiKey,
    getCurrentUser,
    refreshAccessToken
} from "../controllers/user.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", verifyJWT, logoutUser);
router.get("/getApi", verifyJWT, getApiKey);
router.get("/getCurrentUser", verifyJWT, getCurrentUser);

export default router;