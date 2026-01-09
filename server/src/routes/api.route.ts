import {Response, Router} from "express"
import {verifyJWT} from "../middlewares/auth.middleware"
import { RequestLog } from "../models/requestLogs.model"
import { AuthRequest } from "../types/auth.request"

const router = Router()

router.get("/history/:subdomain",verifyJWT, async (req:AuthRequest, res: Response) => {
    try {
        const {subdomain} = req.params;
        const userId = req.user?._id;
        const userLogs = await RequestLog.find({owner: userId , subdomain: subdomain});

        return res.status(200).json({"data": userLogs});
    } catch (error ) {
        throw new Error("Error while getting history ");
    }
});

export default router