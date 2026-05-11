import { User, IUserDocument } from "../models/user.model";
import { Request, Response } from "express";
import crypto from "crypto";
import { AuthRequest } from "../types/auth.request";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken";
import { z } from "zod";

const generateTokens = (user: IUserDocument) => {
  const accesstoken = user.generateAccessToken();
  const refreshtoken = user.generateRefreshToken();
  return { accesstoken, refreshtoken };
};

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = registerSchema.safeParse(req.body);

  if (!validationResult.success) {
    throw new ApiError(400, validationResult.error.issues[0].message);
  }

  const { email, password } = validationResult.data;
  const normalizedEmail = email.toLowerCase();
  const apiKey = crypto.randomBytes(32).toString("hex");

  const user = new User({
    email: normalizedEmail,
    password,
    apiKey,
  });

  const { accesstoken, refreshtoken } = generateTokens(user);
  const hashedRefreshToken = crypto
    .createHash("sha256")
    .update(refreshtoken)
    .digest("hex");

  user.refreshToken = hashedRefreshToken;

  try {
    await user.save();
  } catch (error: any) {
    if (error.code === 11000) {
      throw new ApiError(409, "User with this email already exists");
    }
    throw error;
  }

  res
    .status(201)
    .cookie("accesstoken", accesstoken, cookieOptions)
    .cookie("refreshtoken", refreshtoken, cookieOptions)
    .json({
      message: "SignUp successful",
      data: {
        id: user._id,
        email: user.email,
      },
    });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Invalid credentials");
  }

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  console.log(user);
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

  res
    .status(200)
    .cookie("accesstoken", accesstoken, cookieOptions)
    .cookie("refreshtoken", refreshtoken, cookieOptions)
    .json({
      message: "Login successful",
      data: {
        id: user._id,
        email: user.email,
      },
    });
});

export const logoutUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshToken: 1 }
    });
  }

  res
    .status(200)
    .clearCookie("accesstoken", cookieOptions)
    .clearCookie("refreshtoken", cookieOptions)
    .json({ message: "Logged out successfully" });
});

export const getApiKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const user = await User.findById(req.user._id).select("+apiKey");
  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json({
    message: "API key fetched successfully",
    data: user.apiKey,
  });
});

export const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  res.status(200).json({
    message: "Current user fetched successfully",
    data: {
      id: req.user._id,
      email: req.user.email,
      createdAt: req.user.createdAt,
    },
  });
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies?.refreshtoken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as { _id: string };

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(incomingRefreshToken)
      .digest("hex");

    const user = await User.findOne({
      _id: decoded._id,
      refreshToken: hashedRefreshToken
    });

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    const { accesstoken, refreshtoken: newRefreshToken } = generateTokens(user);

    const newHashedToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    await User.findByIdAndUpdate(user._id, {
      refreshToken: newHashedToken
    });

    return res
      .status(200)
      .cookie("accesstoken", accesstoken, cookieOptions)
      .cookie("refreshtoken", newRefreshToken, cookieOptions)
      .json({
        message: "Access token refreshed",
        data: {
          accesstoken,
          refreshtoken: newRefreshToken
        }
      });

  } catch (error) {
    res.clearCookie("accesstoken", cookieOptions);
    res.clearCookie("refreshtoken", cookieOptions);

    throw new ApiError(401, "Invalid or expired refresh token");
  }
});