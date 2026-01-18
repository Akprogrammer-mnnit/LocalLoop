import { Request, Response } from "express";
import { tunnels, io, requestHistory } from "../app";
import { RequestLog } from "../models/requestLogs.model";
import { Tunnel } from "../models/tunnel.model";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

interface ForwardRequest {
  id: string;
  method: string;
  path: string;
  headers: any;
  body: any;
  query: any;
  timestamp: number;
}

interface LocalResponse {
  status: number;
  headers: any;
  data: any;
}

export const trafficController = asyncHandler(
  async (req: Request, res: Response) => {
    const { part1 } = req.params;
    const rawRest = req.params.rest;
    let rest = "";

    if (Array.isArray(rawRest)) {
      rest = rawRest.join("/");
    } else if (typeof rawRest === "string") {
      rest = rawRest.startsWith("/") ? rawRest.slice(1) : rawRest;
    }

    let socketId: string | undefined;
    let finalSubdomain = "";
    let finalPath = "";

    if (tunnels.has(part1)) {
      socketId = tunnels.get(part1);
      finalSubdomain = part1;
      finalPath = rest;
    } else if (rest) {
      const parts = rest.split("/");
      const possibleSubdomain = parts[0];

      if (possibleSubdomain) {
        const key = `${part1}/${possibleSubdomain}`;
        if (tunnels.has(key)) {
          socketId = tunnels.get(key);
          finalSubdomain = possibleSubdomain;
          finalPath = parts.slice(1).join("/");
        }
      }
    }

    if (!socketId) {
      throw new ApiError(
        404,
        "The tunnel ID or subdomain you requested is not active."
      );
    }

    const payload: ForwardRequest = {
      id: crypto.randomUUID(),
      method: req.method,
      path: finalPath || "/",
      headers: req.headers,
      body: req.body,
      query: req.query,
      timestamp: Date.now(),
    };

    if (!requestHistory.has(finalSubdomain)) {
      requestHistory.set(finalSubdomain, []);
    }

    const history = requestHistory.get(finalSubdomain)!;
    history.unshift(payload);
    if (history.length > 50) history.pop();

    io.to(`dashboard-${finalSubdomain}`).emit("new-request", payload);

    io.to(socketId)
      .timeout(30000)
      .emit(
        "incoming-request",
        payload,
        (err: any, responses: LocalResponse) => {
          if (err) {
            return res
              .status(504)
              .json({ error: "Local CLI failed to respond in time." });
          }

          const response = Array.isArray(responses)
            ? responses[0]
            : responses;

          if (!response || !response.status) {
            return res
              .status(502)
              .json({ error: "Invalid response from CLI" });
          }

          res.status(response.status).set(response.headers).send(response.data);
        }
      );

    const socket = io.sockets.sockets.get(socketId);
    const tunnel = await Tunnel.findOne({ subdomain: finalSubdomain });
    const ownerId = tunnel?.owner ?? socket?.data?.userId;

    if (ownerId) {
      await RequestLog.create({
        owner: ownerId,
        subdomain: finalSubdomain,
        method: req.method,
        path: finalPath || "/",
        headers: req.headers,
        body: req.body,
        timestamp: Date.now(),
      });
    }
  }
);
