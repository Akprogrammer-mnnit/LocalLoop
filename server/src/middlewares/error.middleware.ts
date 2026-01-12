import {Request,Response,NextFunction} from "express"
import { ApiError } from "../utils/ApiError"

export const errorHandler = (
    err: Error | ApiError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500
    let message = "Internal Server Error"

    if (err instanceof ApiError){
        statusCode = err.statusCode;
        message = err.message
    }

    console.error("🔥 ERROR:", err);

    res.status(statusCode).json({
    success: false,
    message,
  });
}

