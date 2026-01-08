import { Request,Response } from "express"
import {tunnels,io,requestHistory} from "../app"
import crypto from "crypto"
interface ForwardRequest {
    id: string,
    method: string,
    path:string,
    headers: any,
    body: any,
    query: any,
    timestamp: number
}


interface LocalResposne {
    status: number,
    headers: any,
    data: any
}
export const trafficController = (req: Request , res: Response) => {
    let {subdomain} = req.params
   
    const targetSocketId = tunnels.get(subdomain)

    if (!targetSocketId){
        return res.status(404).json({
            error: "Tunnel not active",
            message: `No CLI connected for subdomain '${subdomain}'.`
        }) as any;
    }



    const capturedPath = req.params.path || "";
  
    const finalPath = Array.isArray(capturedPath) ? capturedPath.join('/') : capturedPath;

    const payload: ForwardRequest = {
        id: crypto.randomUUID(),
        method: req.method,
        path: finalPath,
        headers: req.headers,
        body: req.body,
        query: req.query,
        timestamp: Date.now()
    }

    if (!requestHistory.has(subdomain)) {
        requestHistory.set(subdomain, []);
    }
    const history = requestHistory.get(subdomain)!;
    history.unshift(payload);
    if (history.length > 50) history.pop();

    io.to(`dashboard-${subdomain}`).emit("new-request", payload);
    console.log(`📨 Forwarding ${req.method} to ${subdomain}/${finalPath}...`);

    io.to(targetSocketId)
        .timeout(5000)
        .emit("incoming-request", payload, (err: any, responses: LocalResposne) => {
            if (err) {
                console.error(`⚠️ Timeout/Error forwarding to ${subdomain}`);
                return res.status(504).json({ error: "Local CLI failed to respond in time." });
            }

            const response = Array.isArray(responses) ? responses[0] : responses;
           console.log("🔍 CLI Response (Unwrapped):", response);

            if (!response || !response.status) {
                console.error("❌ Invalid response structure received from CLI");
                return res.status(502).json({ error: "Invalid response from CLI" });
            }
            res.status(response.status).set(response.headers).send(response.data);
        })
}