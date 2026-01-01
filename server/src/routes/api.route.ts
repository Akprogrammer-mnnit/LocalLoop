import {Router} from "express"
import { requestHistory } from "../app"

const router = Router()

router.get("/history/:subdomain", (req, res) => {
    const { subdomain } = req.params;
    const history = requestHistory.get(subdomain) || [];
    res.json(history);
});

export default router