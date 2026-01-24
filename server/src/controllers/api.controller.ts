import { Response } from "express";
import { RequestLog } from "../models/requestLogs.model";
import { AuthRequest } from "../types/auth.request";
import { Tunnel } from "../models/tunnel.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import redis from "../config/redis";
export const getHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { subdomain } = req.params;

    if (!subdomain) {
      throw new ApiError(400, "Subdomain is required");
    }

    if (req.user?._id) {
      const tunnel = await Tunnel.findOne({ subdomain, owner: req.user?._id });
      if (!tunnel) {
        throw new ApiError(420, "You have no such subdomain");
      }
      const userLogs = await RequestLog.find({ owner: req.user._id, subdomain }).sort({ timestamp: -1 });
      return res.status(200).json({
        success: true,
        source: "database",
        data: userLogs,
      })
    }

    const redisKey = `history:${subdomain}`;
    const rawLogs = await redis.lrange(redisKey, 0, -1);

    const guestLogs = rawLogs.map(log => JSON.parse(log));

    return res.status(200).json({
      success: true,
      source: "redis",
      data: guestLogs,
    });

  }
);

export const getMySubdomains = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized");
    }

    const tunnels = await Tunnel.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      data: tunnels,
    });
  }
);
