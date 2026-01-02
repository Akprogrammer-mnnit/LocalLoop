import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import {Server} from "socket.io"
dotenv.config()


const app = express()
app.use(cors())
app.use(express.json())

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
        if (tunnels.has(subdomain)){
            socket.emit("error","Subdomain already in use");
            return;
        }

        tunnels.set(subdomain,socket.id);
        socket.data.subdomain = subdomain
        console.log(`✅ Registered: https://localloop-server.onrender.com/hook/${subdomain} -> Socket ${socket.id}`);
        socket.emit("registered", { url: `https://localloop-server.onrender.com/hook/${subdomain}` });
    })

    socket.on("disconnect",()=>{
        const subdomain =  socket.data.subdomain;
        if (subdomain && tunnels.get(subdomain) === socket.id){
            tunnels.delete(subdomain);
            console.log(`❌ Tunnel Closed: ${subdomain}`);
        }
    })
})


import handleRouter from "./routes/handle.routes"
import apiRouter from "./routes/api.route"
app.use(handleRouter)

app.use("/api",apiRouter)
export {
    server,
    io
}