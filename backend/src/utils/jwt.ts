import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "./AppError";

export interface AuthTokenPayload {
  userId: string;
  walletAddress: string;
  permissions: string[];
}

export function generateToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (!isAuthTokenPayload(decoded)) {
    throw new AppError("Invalid token payload", 401);
  }

  return {
    userId: decoded.userId,
    walletAddress: decoded.walletAddress,
    permissions: decoded.permissions
  };
}

function isAuthTokenPayload(value: string | JwtPayload): value is JwtPayload & AuthTokenPayload {
  return (
    typeof value !== "string" &&
    typeof value.userId === "string" &&
    typeof value.walletAddress === "string" &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission) => typeof permission === "string")
  );
}
