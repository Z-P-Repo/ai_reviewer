import { Request, Response, NextFunction } from "express";
import StatusCodes from "http-status-codes";
import { env } from "./config";

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey =
    req.header("X-API-Key") ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message:
        "API key is required. Please provide it in the X-API-Key header or Authorization header.",
    });
  }

  if (apiKey !== env.API_KEY) {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "Invalid API key",
    });
  }

  next();
};
