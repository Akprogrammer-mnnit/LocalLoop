import mongoose, { Document } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY!;

if (
  !ACCESS_TOKEN_SECRET ||
  !ACCESS_TOKEN_EXPIRY ||
  !REFRESH_TOKEN_SECRET ||
  !REFRESH_TOKEN_EXPIRY
) {
  throw new Error("JWT env variables are missing");
}

export interface IUserDocument extends Document {
  email: string;
  password: string;
  refreshToken: string;
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

userSchema.methods.isPasswordCorrect = function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    }
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    { _id: this._id },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    }
  );
};



export const User = mongoose.model<IUserDocument>("User", userSchema);
