import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import cookieParser from "cookie-parser"
import { User } from "./models/user.model"
import { Tunnel } from "./models/tunnel.model"
import crypto from 'crypto'
import { errorHandler } from "./middlewares/error.middleware"
import redis from "./config/redis"
import handleRouter from "./routes/handle.routes"
import apiRouter from "./routes/api.route"
import userRouter from "./routes/user.route"
import compression from "compression"
import rateLimit from "express-rate-limit";
import { RedisStore, RedisReply } from "rate-limit-redis";
import jwt from "jsonwebtoken"
dotenv.config()

const app = express()

app.use(cors({
    origin: process.env.ORIGIN,
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())
app.set('trust proxy', 1);
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024
}));

const limiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args: string[]): Promise<RedisReply> =>
            redis.call(...args as [string, ...string[]]) as Promise<RedisReply>,
    }),
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/hook", limiter);
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: process.env.ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    }
})


export const pendingInterceptions = new Map<string, {
    res: any,
    cliSocketId: string,
    originalPayload: any
}>();

export const offlineQueue = new Map<string, Array<(socketId: string) => void>>();

interface LocalResponse {
    status: number;
    headers: any;
    data: any;
}

function parseSocketCookies(cookieString: string | undefined) {
    if (!cookieString) return {};
    return cookieString.split(';').reduce((cookies, item) => {
        const [name, value] = item.split('=').map(c => c.trim());
        cookies[name] = value;
        return cookies;
    }, {} as Record<string, string>);
}
io.use(async (socket, next) => {
    try {
        const apiKey = socket.handshake.auth.apiKey;
        if (apiKey) {
            const user = await User.findOne({ apiKey });
            if (user) {
                socket.data.userId = user._id;
                console.log(`🔑 CLI Login: ${user.email}`);
                return next();
            }
        }

        const cookieString = socket.handshake.headers.cookie;
        const cookies = parseSocketCookies(cookieString);
        const token = cookies['accesstoken'];

        if (token) {
            const decoded = jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "hafuihewauigthwriaghirawgorwabgowr"
            ) as any;

            if (decoded && decoded._id) {
                socket.data.userId = decoded._id;
                console.log(`🍪 Dashboard Login: ${decoded._id}`);
                return next();
            }
        }
        next();

    } catch (error) {
        console.error("Socket Auth Error:", error);
        next();
    }
})

io.on('connection', (socket) => {
    console.log(`New Connection ${socket.id}`)

    socket.on('register', async (data: { subdomain: string, auth?: string } | string) => {

        if (!socket.data.userId) {
            socket.emit("error", { message: "Authentication Required. Please provide a valid API Key." });
            return;
        }

        const subdomain = typeof data === 'string' ? data : data.subdomain;
        const isValidSubdomain = /^[a-z0-9-]+$/.test(subdomain);

        if (!isValidSubdomain || subdomain.length > 63 || subdomain.length < 3) {
            socket.emit("error", { message: "Invalid subdomain. Use 3-63 characters (a-z, 0-9, -)" });
            return;
        }

        const authCredentials = typeof data === 'object' ? data.auth : null;

        try {

            let tunnel = await Tunnel.findOne({ subdomain });

            if (tunnel) {
                if (tunnel.owner.toString() !== socket.data.userId.toString()) {
                    socket.emit("error", { message: "Subdomain is taken by another user." });
                    return;
                }
                await Tunnel.updateOne({ subdomain }, { isActive: true });
            } else {
                try {
                    await Tunnel.create({
                        subdomain: subdomain,
                        owner: socket.data.userId,
                        isActive: true
                    });
                } catch (err: any) {
                    if (err.code === 11000) {
                        socket.emit("error", { message: "Subdomain is taken by another user." });
                        return;
                    }
                    throw err;
                }
            }


            await redis.set(`tunnel:${subdomain}`, socket.id);
            await redis.expire(`tunnel:${subdomain}`, 60);

            if (authCredentials) {
                await redis.set(`auth:${subdomain}`, authCredentials);
                await redis.expire(`auth:${subdomain}`, 60);
            }

            socket.data.subdomain = subdomain;

            console.log(`Registered: ${process.env.PROXY_HOST}/hook/${subdomain} -> Socket ${socket.id}`);

            socket.emit("registered", { url: `${process.env.PROXY_HOST}/hook/${subdomain}/` });

            const pendingRequests = offlineQueue.get(subdomain);
            if (pendingRequests && pendingRequests.length > 0) {
                console.log(`🚀 Flushing ${pendingRequests.length} queued requests for ${subdomain}`);
                pendingRequests.forEach((resolveFn) => resolveFn(socket.id));
                offlineQueue.delete(subdomain);
            }

        } catch (err) {
            console.error("Tunnel Registration Error:", err);
            socket.emit("error", { message: "Server error during registration" });
        }
    });


    socket.on('heartbeat', async (data: { subdomain: string }) => {
        const storedSocketId = await redis.get(`tunnel:${data.subdomain}`);

        if (storedSocketId === socket.id) {
            await redis.expire(`tunnel:${data.subdomain}`, 60);
            await redis.expire(`auth:${data.subdomain}`, 60);
        }
    });

    socket.on('join-room', async (subdomain: string) => {

        if (!socket.data.userId) {
            socket.emit("error", { message: "Unauthorized" });
            return;
        }
        try {
            const tunnel = await Tunnel.findOne({ subdomain, owner: socket.data.userId });

            if (tunnel) {
                socket.join(`dashboard-${subdomain}`);
                console.log(`Socket ${socket.id} joined room dashboard-${subdomain}`);
            } else {
                socket.emit("error", { message: "Access Denied: You do not own this subdomain" });
            }
        } catch (e) {
            console.error("Join room error:", e);
        }
    })

    socket.on("resume-request", (data: { requestId: string, modifiedBody: any, modifiedHeaders: any }) => {
        const pending = pendingInterceptions.get(data.requestId);

        if (pending) {
            const { cliSocketId, originalPayload, res } = pending;

            const finalPayload = {
                ...originalPayload,
                body: data.modifiedBody,
                headers: data.modifiedHeaders
            };

            io.to(cliSocketId).timeout(5000).emit("incoming-request", finalPayload, (err: any, responses: LocalResponse | LocalResponse[]) => {
                if (err) {
                    res.status(504).json({ error: "Timeout waiting for forwarded request" });
                    return;
                }
                const response = Array.isArray(responses) ? responses[0] : responses;

                if (response) {
                    res.status(response.status).set(response.headers).send(response.data);
                }
            });

            pendingInterceptions.delete(data.requestId);
        }
    });


    socket.on("toggle-interception", async (data: { subdomain: string, active: boolean }) => {

        await redis.set(`interception:${data.subdomain}`, String(data.active));
        io.to(`dashboard-${data.subdomain}`).emit("interception-status", data.active);
    });

    socket.on("update-chaos", async (data: { subdomain: string, type: 'none' | 'slow' | 'flaky', value: number }) => {

        await redis.set(`chaos:${data.subdomain}`, JSON.stringify({ type: data.type, value: data.value }));
        io.to(`dashboard-${data.subdomain}`).emit("chaos-updated", data);
    });

    socket.on("update-rules", async (data: { subdomain: string, script: string }) => {

        await redis.set(`rules:${data.subdomain}`, data.script);
        io.to(`dashboard-${data.subdomain}`).emit("rules-updated", data.script);
    });

    socket.on("disconnect", async () => {
        const subdomain = socket.data.subdomain;

        if (subdomain) {
            const storedSocketId = await redis.get(`tunnel:${subdomain}`);

            if (storedSocketId === socket.id) {
                await redis.del(`tunnel:${subdomain}`);

                if (socket.data.userId) {
                    try {
                        await Tunnel.updateOne({ subdomain }, { isActive: false });
                    } catch (e) { console.error("Error updating tunnel status:", e); }
                }

                console.log(`Tunnel Closed: ${subdomain}`);
            }
        }
    })
})

app.use(handleRouter)
app.use("/api", apiRouter)
app.use("/api", userRouter)
app.use(errorHandler)

export {
    server,
    io
}