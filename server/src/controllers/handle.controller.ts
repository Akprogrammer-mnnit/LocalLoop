import { Request, Response } from "express";
import { io, interceptionActive, pendingInterceptions, chaosSettings, trafficRules, offlineQueue } from "../app";
import { RequestLog } from "../models/requestLogs.model";
import { Tunnel } from "../models/tunnel.model";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import redis from "../config/redis";
import { Mock } from "../models/MockRoute.model";
import ivm from "isolated-vm";

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
  isBinary?: boolean;
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

    let socketId: string | null = null;
    let finalSubdomain = "";
    let finalPath = "";

    const directTunnelId = await redis.get(`tunnel:${part1}`);

    if (directTunnelId) {
      socketId = directTunnelId;
      finalSubdomain = part1;
      finalPath = rest;
    } else if (rest) {
      const parts = rest.split("/");
      const possibleSubdomain = parts[0];
      const key = `${part1}/${possibleSubdomain}`;

      const nestedTunnelId = await redis.get(`tunnel:${key}`);

      if (nestedTunnelId) {
        socketId = nestedTunnelId;
        finalSubdomain = key;
        finalPath = parts.slice(1).join("/");
      }
    }


    const requiredAuth = await redis.get(`auth:${finalSubdomain}`);

    if (requiredAuth) {

      const authHeader = req.headers.authorization || '';
      const [type, credentials] = authHeader.split(' ');

      let isAuthenticated = false;

      if (type === 'Basic' && credentials) {

        const userPass = Buffer.from(credentials, 'base64').toString();
        if (userPass === requiredAuth) {
          isAuthenticated = true;
        }
      }

      if (!isAuthenticated) {

        res.set('WWW-Authenticate', `Basic realm="Restricted Area: ${finalSubdomain}"`);
        return res.status(401).send('Authentication required.');
      }
    }

    const cacheKey = `cache:${finalSubdomain}:${req.method}:${finalPath}`;
    const startTime = performance.now();

    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      const result = JSON.parse(cachedData);

      const duration = (performance.now() - startTime).toFixed(2);
      const pathForLog = finalPath.startsWith("/") ? finalPath : `/${finalPath}`;
      console.log(`[CACHE HIT] ${finalSubdomain}${pathForLog} - ${duration}ms`);
      return res.status(result.status).set(result.headers).send(
        result.isBinary ? Buffer.from(result.data, 'base64') : result.data
      );
    }

    const chaos = chaosSettings.get(finalSubdomain);

    if (chaos && chaos.type !== 'none') {
      if (chaos.type == 'slow') {
        await new Promise(resolve => setTimeout(resolve, chaos.value));
      }
      else if (chaos.type == 'flaky') {
        const shouldFail = Math.random() * 100 < chaos.value;

        if (shouldFail) {
          io.to(`dashboard-${finalSubdomain}`).emit("new-request", {
            id: "CHAOS-" + Date.now(),
            method: req.method,
            path: finalPath || "/",
            headers: req.headers,
            body: req.body,
            timestamp: Date.now(),
            status: 500,
            error: "Artificial Chaos Failure"
          });
          return res.status(500).json({ error: "Chaos Mode: Artificial Failure Triggered 💥" });
        }
      }
    }

    const searchPath = finalPath.startsWith("/") ? finalPath : `/${finalPath}`;

    const mockRule = await Mock.findOne({
      subdomain: finalSubdomain,
      method: req.method,
      path: searchPath
    });
    if (mockRule) {

      const mockPayload = {
        id: "MOCK-" + Date.now(),
        method: req.method,
        path: finalPath || "/",
        headers: req.headers,
        body: req.body || {},
        query: req.query,
        timestamp: Date.now(),
        isMock: true
      };
      io.to(`dashboard-${finalSubdomain}`).emit("new-request", mockPayload);

      return res.status(mockRule.status).json(JSON.parse(mockRule.body));
    }

    if (!socketId) {
      if (!finalSubdomain || finalSubdomain === "") {
        finalSubdomain = part1;
        finalPath = rest;
      }
      console.log(`⏳ User ${finalSubdomain} is offline. Queueing request...`);

      try {

        socketId = await new Promise<string>((resolve, reject) => {

          const timeout = setTimeout(() => {

            const currentQueue = offlineQueue.get(finalSubdomain) || [];
            const newQueue = currentQueue.filter(fn => fn !== onReconnect);
            if (newQueue.length === 0) offlineQueue.delete(finalSubdomain);
            else offlineQueue.set(finalSubdomain, newQueue);

            reject(new ApiError(504, "Tunnel is offline and did not reconnect in time."));
          }, 20000);


          const onReconnect = (newSocketId: string) => {
            clearTimeout(timeout);
            resolve(newSocketId);
          };


          const existing = offlineQueue.get(finalSubdomain) || [];
          existing.push(onReconnect);
          offlineQueue.set(finalSubdomain, existing);
        });

        console.log(`✅ User ${finalSubdomain} reconnected! Forwarding request...`);

      } catch (err) {
        throw err;
      }
    }


    const userScript = trafficRules.get(finalSubdomain);

    if (userScript && userScript.trim() !== "") {
      try {
        console.log("🔹 [DEBUG] Body BEFORE VM:", JSON.stringify(req.body));
        const isolate = new ivm.Isolate({ memoryLimit: 8 });
        const context = isolate.createContextSync();
        const jail = context.global;

        const safeRequestData = {
          method: req.method,
          path: finalPath || "/",
          headers: req.headers,
          body: req.body,
          query: req.query
        };

        jail.setSync("global", jail.derefInto());
        jail.setSync("req", new ivm.ExternalCopy(safeRequestData).copyInto());

        jail.setSync("_log", new ivm.Reference((msg: string) => {
          console.log(`[USER-SCRIPT] ${finalSubdomain}:`, msg);
        }));



        const scriptCode = `
          const log = function(arg) { 
            _log.applySync(undefined, [String(arg)]); 
          };
          
          (function() {
             let method = req.method;
             let path = req.path;
             let headers = req.headers;
             let body = req.body;
             let query = req.query;
            
             ${userScript}
          })();
        `;

        const script = isolate.compileScriptSync(scriptCode);
        script.runSync(context, { timeout: 50 });

        const modifiedData = jail.getSync("req").copySync();
        console.log("🔸 [DEBUG] Body AFTER VM:", JSON.stringify(modifiedData.body));
        req.method = modifiedData.method;
        req.headers = modifiedData.headers;
        req.body = modifiedData.body;

      } catch (err: any) {
        console.error(`❌ Traffic Rule Error (${finalSubdomain}):`, err.message);
      }
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

    if (interceptionActive.get(finalSubdomain)) {
      pendingInterceptions.set(payload.id, {
        res,
        cliSocketId: socketId,
        originalPayload: payload
      });

      io.to(`dashboard-${finalSubdomain}`).emit("intercepted-request", payload);

      return;
    }
    io.to(`dashboard-${finalSubdomain}`).emit("new-request", payload);

    io.to(socketId)
      .timeout(30000)
      .emit(
        "incoming-request",
        payload,
        async (err: any, responses: LocalResponse) => {
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

          if (req.method === "GET" && response.status === 200) {

            await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);

          }

          let finalData = response.data;
          if (response.isBinary) {
            finalData = Buffer.from(response.data, 'base64');
          }

          const duration = (performance.now() - startTime).toFixed(2);
          console.log(`[CACHE MISS] ${finalSubdomain}${searchPath} - ${duration}ms`);

          res.status(response.status).set(response.headers).send(finalData);
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
    else {
      const key = `history:${finalSubdomain}`
      await redis.lpush(key, JSON.stringify(payload));
      await redis.ltrim(key, 0, 19);
      await redis.expire(key, 3600);
    }
  }
);