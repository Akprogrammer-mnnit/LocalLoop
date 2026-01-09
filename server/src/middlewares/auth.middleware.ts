import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { AuthRequest } from "../types/auth.request";

dotenv.config();
  
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET missing");
}

export const verifyJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.accesstoken;
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as {
      _id: mongoose.Types.ObjectId;
      email: string;
    };

    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
