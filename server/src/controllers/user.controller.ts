import { User, IUserDocument } from "../models/user.model";
import { Request, Response } from "express";
import crypto from "crypto";
import { AuthRequest } from "../types/auth.request";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const generateTokens = (user: IUserDocument) => {
  const accesstoken = user.generateAccessToken();
  const refreshtoken = user.generateRefreshToken();
  return { accesstoken, refreshtoken };
};

export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password || password.length < 8) {
      throw new ApiError(400, "Invalid credentials");
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw new ApiError(409, "User already exists");
    }

    const apiKey = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      email: normalizedEmail,
      password,
      apiKey,
    });

    const { accesstoken, refreshtoken } = generateTokens(user);

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshtoken)
      .digest("hex");

    await User.findByIdAndUpdate(user._id, {
      refreshToken: hashedRefreshToken,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res
      .cookie("accesstoken", accesstoken, cookieOptions)
      .cookie("refreshtoken", refreshtoken, cookieOptions)
      .status(200)
      .json({
        message: "SignUp successful",
        data: {
          id: user._id,
          email: user.email,
        },
      });
  }
);

export const loginUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Invalid credentials");
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isValid = await user.isPasswordCorrect(password);
    if (!isValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const { accesstoken, refreshtoken } = generateTokens(user);

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshtoken)
      .digest("hex");

    await User.findByIdAndUpdate(user._id, {
      refreshToken: hashedRefreshToken,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res
      .cookie("accesstoken", accesstoken, cookieOptions)
      .cookie("refreshtoken", refreshtoken, cookieOptions)
      .status(200)
      .json({
        message: "Login successful",
        data: {
          id: user._id,
          email: user.email,
        },
      });
  }
);

export const getApiKey = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await User.findById(req.user._id).select("+apiKey");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      message: "API key fetched successfully",
      data: user.apiKey,
    });
  }
);

export const getCurrentUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    res.status(200).json({
      message: "Current user fetched successfully",
      data: {
        id: req.user._id,
        email: req.user.email,
        createdAt: req.user.createdAt,
      },
    });
  }
);
