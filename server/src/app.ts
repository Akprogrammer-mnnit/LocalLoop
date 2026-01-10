import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import {Server} from "socket.io"
import cookieParser from "cookie-parser"
import {User} from "./models/user.model"
import {Tunnel} from "./models/tunnel.model" 
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
    
    socket.on('register', async (subdomain:string)=>{
        if (socket.data.userId){
            try {
               
                const existingTunnel = await Tunnel.findOne({ subdomain });

                if (existingTunnel) {
                   
                    if (existingTunnel.owner.toString() !== socket.data.userId.toString()) {
                        socket.emit("error", { message: "⛔ Subdomain is taken by another user." });
                        return;
                    }
                  
                    await Tunnel.updateOne({ subdomain }, { isActive: true });
                } else {
                   
                    await Tunnel.create({
                        subdomain: subdomain,
                        owner: socket.data.userId,
                        isActive: true
                    });
                }

              
                tunnels.set(subdomain,socket.id);
                socket.data.subdomain = subdomain;

                console.log(`✅ Registered: ${process.env.PROXY_HOST}/hook/${subdomain} -> Socket ${socket.id}`);
                socket.emit("registered", { url: `${process.env.PROXY_HOST}/hook/${subdomain}` });

            } catch (err) {
                console.error("Tunnel Registration Error:", err);
                socket.emit("error", { message: "Server error during registration" });
            }
        }
        else {
            const token = crypto.randomBytes(32).toString("hex");
            
            tunnels.set(`${token}/${subdomain}`,socket.id);
            socket.data.subdomain = `${token}/${subdomain}`;

            socket.emit("registered", { url: `${process.env.PROXY_HOST}/hook/${token}/${subdomain}` });
        }
    })

    socket.on('join-room',(data)=>{
        socket.join(`dashboard-${data}`);   
    })
    
    socket.on("disconnect", async ()=>{
        const subdomain = socket.data.subdomain;
       
        if (subdomain && tunnels.get(`${subdomain}`) === socket.id){
            tunnels.delete(`${subdomain}`);
           
            if (socket.data.userId) {
                try {
                    await Tunnel.updateOne({ subdomain }, { isActive: false });
                } catch (e) { console.error("Error updating tunnel status:", e); }
            }

            console.log(`❌ Tunnel Closed: ${subdomain}`);
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