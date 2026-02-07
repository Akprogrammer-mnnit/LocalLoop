import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid Resource ID: ${err.path}`;
    }

    if (err.code === 11000) {
        statusCode = 409;
        message = "Duplicate value entered for unique field";
    }

    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid Token";
    }

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
    }

    if (statusCode >= 500) {
        console.error("🔥 ERROR:", err);
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};