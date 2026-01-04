import { User, IUserDocument } from "../models/user.model";
import { Request, Response } from "express";
import crypto from "crypto";

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

    const user = await User.create({
      email: normalizedEmail,
      password,
    });

    return res.status(201).json({
      data: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
      },
      message: "User created successfully",
    });
  } catch {
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
