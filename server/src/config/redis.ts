import Redis from "ioredis"
import dotenv from "dotenv"
import { ApiError } from "../utils/ApiError";

dotenv.config()


const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new ApiError(404, "Redis URL not found");
}

const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined
})

redis.on("connect", () => console.log("✅ Redis Connected"));
redis.on("error", (err) => console.error("❌ Redis Error:", err));

export default redis;