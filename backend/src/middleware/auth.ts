import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/apiError";

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing bearer token"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}
