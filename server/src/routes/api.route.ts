import { Router } from "express";
import { getHistory, getMySubdomains, getSessions, saveSession, deleteSession, getCurrentChaos, getCurrentRules } from "../controllers/api.controller";
import { getMocks, addMock, deleteMock } from "../controllers/mock.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();
router.route("/history/:subdomain").get(verifyJWT, getHistory);
router.route("/my-subdomains").get(verifyJWT, getMySubdomains);
router.get("/mocks/:subdomain", verifyJWT, getMocks);
router.post("/mocks", verifyJWT, addMock);
router.delete("/mocks/:id", verifyJWT, deleteMock);
router.get("/sessions/:subdomain", verifyJWT, getSessions);
router.post("/sessions", verifyJWT, saveSession);
router.delete("/sessions/:id", verifyJWT, deleteSession);
router.get("/chaos/:subdomain", verifyJWT, getCurrentChaos);
router.get("/rules/:subdomain", verifyJWT, getCurrentRules);
export default router;