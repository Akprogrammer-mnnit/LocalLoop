import { Response } from "express";
import { RequestLog } from "../models/requestLogs.model";
import { AuthRequest } from "../types/auth.request";
import { Tunnel } from "../models/tunnel.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const getHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { subdomain } = req.params;

    if (!subdomain) {
      throw new ApiError(400, "Subdomain is required");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized");
    }

    const userLogs = await RequestLog.find({
      owner: req.user._id,
      subdomain,
    });

    res.status(200).json({
      success: true,
      data: userLogs,
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
