import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import {Server} from "socket.io"
import cookieParser from "cookie-parser"
import {User} from "./models/user.model"
import crypto from 'crypto'
dotenv.config()


const app = express()
app.use(cors({
    origin: process.env.ORIGIN,
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())
const server = http.createServer(app)


const io = new Server(server,{
    cors: {
        origin: process.env.ORIGIN,
        methods: ["GET","POST"]
    }
})

export const tunnels = new Map<string, string>()
export const requestHistory = new Map<string, any[]>()


io.use(async(socket,next) => {
    const apiKey = socket.handshake.auth.apiKey;
    if (apiKey){
        const user = await User.findOne({apiKey});
        if (user){
            socket.data.userId = user._id;
            console.log(`🔑 Logged in: ${user.email}`);
        }
    }
    next();
})
io.on('connection',(socket)=>{
    console.log(`🔌 New Connection ${socket.id}`)
    socket.on('register',(subdomain:string)=>{
        if (socket.data.userId){
            tunnels.set(subdomain,socket.id);
            console.log(`✅ Registered: ${process.env.PROXY_HOST}/hook/${subdomain} -> Socket ${socket.id}`);
            socket.emit("registered", { url: `${process.env.PROXY_HOST}/hook/${subdomain}` });
        }
        else {
            const token = crypto.randomBytes(32).toString("hex");
            tunnels.set(`${token}/${subdomain}`,socket.id);
            socket.emit("registered", { url: `${process.env.PROXY_HOST}/hook/${token}/${subdomain}` });
        }
    })

    socket.on('join-room',(data)=>{
        socket.join(`dashboard-${data}`);   
    })
    socket.on("disconnect",()=>{
        const subdomain =  socket.data.subdomain;
       
       
    
        if (subdomain && tunnels.get(`${subdomain}`) === socket.id){
            tunnels.delete(`${subdomain}`);
            console.log(`❌ Tunnel Closed: ${subdomain}`);
        }
    })
})


import handleRouter from "./routes/handle.routes"
import apiRouter from "./routes/api.route"
import userRouter from "./routes/user.route"
import { getApiKey } from './controllers/user.controller';
app.use(handleRouter)

app.use("/api",apiRouter)

app.use("/api",userRouter)
export {
    server,
    io
}