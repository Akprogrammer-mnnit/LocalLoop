import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import {Server} from "socket.io"
import cookieParser from "cookie-parser"
import crypto from "crypto"
dotenv.config()


const app = express()
app.use(cors())
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

io.on('connection',(socket)=>{
    console.log(`🔌 New Connection ${socket.id}`)
    socket.on('register',(subdomain:string)=>{
        const token = crypto.randomBytes(32).toString("hex") 
        if (tunnels.has(`${token}/${subdomain}`)){
            socket.emit("error","Subdomain already in use");
            return;
        }

        tunnels.set(`${token}/${subdomain}`,socket.id);
        socket.data.subdomain = subdomain
        socket.data.token = token;
        console.log(`✅ Registered: https://localloop-server.onrender.com/hook/${token}/${subdomain} -> Socket ${socket.id}`);
        socket.emit("registered", { url: `https://localloop-server.onrender.com/hook/${token}/${subdomain}` });
    })

    socket.on('join-room',(data)=>{
        socket.join(`dashboard-${data}`);   
    })
    socket.on("disconnect",()=>{
        const subdomain =  socket.data.subdomain;
        const token = socket.data.token;
    
        if (subdomain && tunnels.get(`${token}/${subdomain}`) === socket.id){
            tunnels.delete(`${token}/${subdomain}`);
            console.log(`❌ Tunnel Closed: ${token}/${subdomain}`);
        }
    })
})


import handleRouter from "./routes/handle.routes"
import apiRouter from "./routes/api.route"
import userRouter from "./routes/user.route"
app.use(handleRouter)

app.use("/api",apiRouter)

app.use("/api",userRouter)
export {
    server,
    io
}