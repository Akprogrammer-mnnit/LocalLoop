import { Request, Response } from "express";
import { io, pendingInterceptions, offlineQueue } from "../app";
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
    let finalSubdomain = part1;
    let finalPath = rest;

    const directTunnelId = await redis.get(`tunnel:${finalSubdomain}`);

    if (directTunnelId) {
      socketId = directTunnelId;
    }

    const searchPath = finalPath.startsWith("/") ? finalPath : `/${finalPath}`;
    const cacheKey = `cache:${finalSubdomain}:${req.method}:${finalPath}`;
    const startTime = performance.now();

    const [
      requiredAuth,
      cachedData,
      chaosRaw,
      userScript,
      isInterceptionStr,
      mockRule
    ] = await Promise.all([
      redis.get(`auth:${finalSubdomain}`),
      redis.get(cacheKey),
      redis.get(`chaos:${finalSubdomain}`),
      redis.get(`rules:${finalSubdomain}`),
      redis.get(`interception:${finalSubdomain}`),
      Mock.findOne({ subdomain: finalSubdomain, method: req.method, path: searchPath })
    ]);

    if (requiredAuth) {
      const authHeader = req.headers.authorization || '';
      const [type, credentials] = authHeader.split(' ');
      let isAuthenticated = false;

      if (type === 'Basic' && credentials) {
        const userPass = Buffer.from(credentials, 'base64').toString();
        const bufferUserPass = Buffer.from(userPass);
        const bufferRequired = Buffer.from(requiredAuth);

        if (bufferUserPass.length === bufferRequired.length && crypto.timingSafeEqual(bufferUserPass, bufferRequired)) {
          isAuthenticated = true;
        }
      }

      if (!isAuthenticated) {
        res.set('WWW-Authenticate', `Basic realm="Restricted Area: ${finalSubdomain}"`);
        return res.status(401).send('Authentication required.');
      }
    }

    if (cachedData) {
      const result = JSON.parse(cachedData);
      return res.status(result.status).set(result.headers).send(
        result.isBinary ? Buffer.from(result.data, 'base64') : result.data
      );
    }

    if (chaosRaw) {
      const chaos = JSON.parse(chaosRaw);
      if (chaos.type === 'slow') {
        await new Promise(resolve => setTimeout(resolve, chaos.value));
      } else if (chaos.type === 'flaky') {
        const shouldFail = Math.random() * 100 < chaos.value;
        if (shouldFail) {
          io.to(`dashboard-${finalSubdomain}`).emit("new-request", {
            id: "CHAOS-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
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

    if (mockRule) {
      const mockPayload = {
        id: "MOCK-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
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
      try {
        socketId = await new Promise<string>((resolve, reject) => {
          const currentQueue = offlineQueue.get(finalSubdomain) || [];
          if (currentQueue.length >= 50) {
            return reject(new ApiError(503, "Queue limit reached. Tunnel offline."));
          }

          const timeout = setTimeout(() => {
            const currentQ = offlineQueue.get(finalSubdomain) || [];
            const newQueue = currentQ.filter(fn => fn !== onReconnect);
            if (newQueue.length === 0) offlineQueue.delete(finalSubdomain);
            else offlineQueue.set(finalSubdomain, newQueue);

            reject(new ApiError(504, "Tunnel is offline and did not reconnect in time."));
          }, 20000);

          const onReconnect = (newSocketId: string) => {
            clearTimeout(timeout);
            resolve(newSocketId);
          };

          currentQueue.push(onReconnect);
          offlineQueue.set(finalSubdomain, currentQueue);
        });
      } catch (err) {
        throw err;
      }
    }

    if (userScript && userScript.trim() !== "") {
      let isolate: ivm.Isolate | null = null;
      try {
        isolate = new ivm.Isolate({ memoryLimit: 8 });
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
          io.to(`dashboard-${finalSubdomain}`).emit("script-log", {
            message: msg,
            timestamp: Date.now()
          });
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
        req.method = modifiedData.method;
        req.headers = modifiedData.headers;
        req.body = modifiedData.body;

      } catch (err: any) {
        console.error(`❌ Traffic Rule Error (${finalSubdomain}):`, err.message);
      } finally {
        if (isolate) {
          isolate.dispose();
        }
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

    if (isInterceptionStr === 'true') {
      const timeoutId = setTimeout(() => {
        if (pendingInterceptions.has(payload.id)) {
          pendingInterceptions.delete(payload.id);
          if (!res.headersSent) {
            res.status(504).json({ error: "Interception timeout exceeded." });
          }
        }
      }, 60000);

      pendingInterceptions.set(payload.id, {
        res,
        cliSocketId: socketId,
        originalPayload: payload,
        timeoutId
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
            return res.status(504).json({ error: "Local CLI failed to respond in time." });
          }

          const response = Array.isArray(responses) ? responses[0] : responses;

          if (!response || !response.status) {
            return res.status(502).json({ error: "Invalid response from CLI" });
          }

          if (req.method === "GET" && response.status === 200) {
            const cacheControl = response.headers['cache-control'] || response.headers['Cache-Control'];

            if (cacheControl) {
              const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);

              if (maxAgeMatch && !cacheControl.includes('no-store') && !cacheControl.includes('no-cache')) {
                const ttl = parseInt(maxAgeMatch[1], 10);
                if (ttl > 0) {
                  await redis.set(cacheKey, JSON.stringify(response), 'EX', ttl);
                }
              }
            }
          }

          let finalData = response.data;
          if (response.isBinary) {
            finalData = Buffer.from(response.data, 'base64');
          }

          res.status(response.status).set(response.headers).send(finalData);
        }
      );

    (async () => {
      try {
        const socket = io.sockets.sockets.get(socketId as string);
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
      } catch (logError) {
        console.error("⚠️ Failed to log request:", logError);
      }
    })();
  }
);