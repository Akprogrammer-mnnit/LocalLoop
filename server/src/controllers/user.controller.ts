import { User, IUserDocument } from "../models/user.model";
import { Request, Response } from "express";
import crypto from "crypto";
import { AuthRequest } from "../types/auth.request";
const generateTokens = (user: IUserDocument) => {
  const accesstoken = user.generateAccessToken();
  const refreshtoken = user.generateRefreshToken();
  return { accesstoken, refreshtoken };
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    
    const { email, password } = req.body;

    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
   

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
  
    if (existingUser) { 
      return res.status(409).json({ error: "User already exists" });
    }

    const apiKey = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      email: normalizedEmail,
      password,
      apiKey
    });
  
    const {accesstoken,refreshtoken} = generateTokens(user);
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

    return res
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
  } catch(error) {
    console.log("Error in registering user: ",error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValid = await user.isPasswordCorrect(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
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

    return res
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
  } catch {
    return res.status(500).json({ error: "Login failed" });
  }
};


export const getApiKey = async (req: AuthRequest, res: Response) => {
  try {
   
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user._id).select("+apiKey");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "API key fetched successfully",
      data: user.apiKey,
    });
  } catch {
    return res.status(500).json({ message: "Failed to fetch API key" });
  }
};


export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
   
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
   
    return res.status(200).json({
      message: "Current user fetched successfully",
      data: {
        id: req.user._id,
        email: req.user.email,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get current user",
    });
  }
};