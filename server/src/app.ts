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
        origin: process.env.ORIGIN
    }
})

export const tunnels = new Map<string, string>()

io.on('connection',(socket)=>{
    console.log(`🔌 New Connection ${socket.id}`)

    socket.on('register',(subdomain:string)=>{
        if (tunnels.has(subdomain)){
            socket.emit("error","Subdomain already in use");
            return;
        }

        tunnels.set(subdomain,socket.id);
        socket.data.subdomain = subdomain
        console.log(`✅ Registered: https://localloop.com/hook/${subdomain} -> Socket ${socket.id}`);
        socket.emit("registered", { url: `http://localhost:3000/hook/${subdomain}` });
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

app.use(handleRouter)

export {
    server,
    io
}