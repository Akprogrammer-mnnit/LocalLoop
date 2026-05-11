import { Response } from "express";
import { RequestLog } from "../models/requestLogs.model";
import { AuthRequest } from "../types/auth.request";
import { Tunnel } from "../models/tunnel.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import redis from "../config/redis";
import { Session } from "../models/session.model";

export const getHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { subdomain } = req.params;
    if (!subdomain) {
      throw new ApiError(400, "Subdomain is required");
    }
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized");
    }

    const tunnel = await Tunnel.findOne({ subdomain, owner: req.user._id });
    if (!tunnel) {
      throw new ApiError(403, "You do not have access to this subdomain");
    }

    const userLogs = await RequestLog.find({ owner: req.user._id, subdomain }).sort({ timestamp: -1 });
    return res.status(200).json({
      success: true,
      source: "database",
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

export const saveSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subdomain, name, requests } = req.body;

  if (!requests || requests.length === 0) {
    throw new ApiError(400, "Cannot save empty session");
  }

  if (!req.user?._id) {
    throw new ApiError(401, "You must be logged in to save sessions");
  }

  const tunnel = await Tunnel.findOne({ subdomain, owner: req.user._id });
  if (!tunnel) {
    throw new ApiError(403, "You cannot save sessions for a subdomain you do not own");
  }

  const session = await Session.create({
    owner: req.user._id,
    subdomain,
    name,
    requests
  });

  res.status(201).json({ success: true, data: session });
});

export const getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subdomain } = req.params;

  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }
  const sessions = await Session.find({ subdomain, owner: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({ data: sessions });
});

export const deleteSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }
  const deletedSession = await Session.findOneAndDelete({ _id: id, owner: req.user._id });

  if (!deletedSession) {
    throw new ApiError(404, "Session not found or you do not have permission to delete it");
  }

  res.status(200).json({ success: true });
});

export const getCurrentChaos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subdomain } = req.params;
  const data = await redis.get(`chaos:${subdomain}`);
  res.json(data ? JSON.parse(data) : { type: 'none', value: 0 });
})

export const getCurrentRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subdomain } = req.params;
  const script = await redis.get(`rules:${subdomain}`);
  return res.json({ script: script || undefined });
})