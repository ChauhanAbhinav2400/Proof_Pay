import type { NextFunction, Request, Response } from "express";

import { userRepository } from "../repositories/user";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("Authentication token required.", 401);
    }

    const token = authorization.slice("Bearer ".length);
    const payload = verifyToken(token);
    const user = await userRepository.findById(payload.userId);

    if (!user || user.walletAddress !== payload.walletAddress) {
      throw new AppError("Invalid authentication token.", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError("Invalid authentication token.", 401));
  }
}
