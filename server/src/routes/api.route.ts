import { Router } from "express";
import { getHistory, getMySubdomains } from "../controllers/api.controller";
import { getMocks, addMock, deleteMock } from "../controllers/mock.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();
router.route("/history/:subdomain").get(verifyJWT, getHistory);
router.route("/guest/history/:subdomain").get(getHistory);
router.route("/my-subdomains").get(verifyJWT, getMySubdomains);
router.get("/mocks/:subdomain", getMocks);
router.post("/mocks", addMock);
router.delete("/mocks/:id", deleteMock);

export default router;