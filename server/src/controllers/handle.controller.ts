import { Request, Response } from "express";
import { tunnels, io, requestHistory } from "../app";
import { RequestLog } from "../models/requestLogs.model";
import crypto from "crypto";

interface ForwardRequest {
    id: string;
    method: string;
    path: string;
    headers: any;
    body: any;
    query: any;
    timestamp: number;
}

interface LocalResposne {
    status: number;
    headers: any;
    data: any;
}

export const trafficController = async (req: Request, res: Response) => {
    const { part1 } = req.params;
    console.log(part1);
    const rawRest = req.params.rest;
    console.log(rawRest);
    let rest = "";

    if (Array.isArray(rawRest)) {
        rest = rawRest.join('/');
    } else if (typeof rawRest === 'string') {
        rest = rawRest.startsWith('/') ? rawRest.slice(1) : rawRest;
    }

    console.log(rest);
    let socketId: string | undefined;
    let finalSubdomain: string = "";
    let finalPath: string = "";

    if (tunnels.has(part1)) {
        socketId = tunnels.get(part1);
        finalSubdomain = part1;
        finalPath = rest;
    } 
    else if (rest) {
        const parts = rest.split('/'); 
        
        const possibleSubdomain = parts[0]; 
        
        if (possibleSubdomain) {
            const key = `${part1}/${possibleSubdomain}`;
            
            if (tunnels.has(key)) {
                socketId = tunnels.get(key);
                finalSubdomain = possibleSubdomain;
                finalPath = parts.slice(1).join('/');
            }
        }
    }

    if (!socketId) {
        return res.status(404).json({ 
            error: "Tunnel not found",
            message: "The tunnel ID or subdomain you requested is not active." 
        });
    }

    const payload: ForwardRequest = {
        id: crypto.randomUUID(),
        method: req.method,
        path: finalPath || "/",
        headers: req.headers,
        body: req.body,
        query: req.query,
        timestamp: Date.now()
    };

    if (!requestHistory.has(finalSubdomain)) {
        requestHistory.set(finalSubdomain, []);
    }
    const history = requestHistory.get(finalSubdomain)!;
    history.unshift(payload);
    if (history.length > 50) history.pop();

    
    io.to(`dashboard-${finalSubdomain}`).emit("new-request", payload);
    
    io.to(socketId)
        .timeout(5000)
        .emit("incoming-request", payload, (err: any, responses: LocalResposne) => {
            if (err) {
                console.error(`⚠️ Timeout/Error forwarding to ${finalSubdomain}`);
                return res.status(504).json({ error: "Local CLI failed to respond in time." });
            }

            const response = Array.isArray(responses) ? responses[0] : responses;
            if (!response || !response.status) {
                console.error("❌ Invalid response from CLI");
                return res.status(502).json({ error: "Invalid response from CLI" });
            }
            res.status(response.status).set(response.headers).send(response.data);
        });

    const socket = io.sockets.sockets.get(socketId);
    if (socket && socket.data.userId) {
        try {
            await RequestLog.create({
                owner: socket.data.userId,
                subdomain: finalSubdomain,
                method: req.method,
                path: finalPath || "/",
                headers: req.headers,
                body: req.body,
                timestamp: Date.now()
            });
        } catch (dbError) {
            console.error("Failed to save log to DB:", dbError);
        }
    }
};