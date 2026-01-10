import {Response} from "express"
import { RequestLog } from "../models/requestLogs.model"
import { AuthRequest } from "../types/auth.request"
import {Tunnel} from "../models/tunnel.model"
export const getHistory = async (req:AuthRequest, res: Response) => {
    try {
        const {subdomain} = req.params;
        const userId = req.user?._id;
        const userLogs = await RequestLog.find({owner: userId , subdomain: subdomain});

        return res.status(200).json({"data": userLogs});
    } catch (error ) {
        throw new Error("Error while getting history ");
    }
}


export const getMySubdomains = async(req:AuthRequest , res: Response) => {
    try {
        const userId = req.user?._id;
        const tunnels = await Tunnel.find({owner:userId}).sort({ createdAt: -1 });
        return res.status(200).json({"data": tunnels});
        
    } catch (error) {
        throw new Error("Error while getting all subdmains");
    }
}