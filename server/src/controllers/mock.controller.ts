import { Request, Response } from "express";
import { Mock } from "../models/MockRoute.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Tunnel } from "../models/tunnel.model";
export const getMocks = asyncHandler(async (req: Request, res: Response) => {
    const { subdomain } = req.params;
    if (!subdomain) throw new ApiError(400, "Subdomain required");

    const mocks = await Mock.find({ subdomain }).sort({ createdAt: -1 });

    res.status(200).json(mocks);
});

export const addMock = asyncHandler(async (req: Request, res: Response) => {
    let { subdomain, method, path, status, body } = req.body;
    if (typeof body === 'object') {
        body = JSON.stringify(body);
    }
    if (!subdomain || !method || !path) {
        throw new ApiError(400, "Missing required fields");
    }
    const tunnel = await Tunnel.findOne({ subdomain });
    if (!tunnel) {
        throw new ApiError(404, "Tunnel not found");
    }

    if (tunnel.owner.toString() !== (req as any).user._id.toString()) {
        throw new ApiError(403, "You do not own this subdomain");
    }
    const mock = await Mock.findOneAndUpdate(
        { subdomain, method, path },
        { status, body },
        { new: true, upsert: true }
    );

    res.status(201).json(mock);
});

export const deleteMock = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await Mock.findByIdAndDelete(id);
    res.status(200).json({ success: true });
});