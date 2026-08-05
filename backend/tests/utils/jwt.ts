import jwt, { type SignOptions } from "jsonwebtoken";

import { createObjectIdString } from "./object-id";
import { randomWallet } from "./random";

export interface TestJwtPayload {
  userId: string;
  walletAddress: string;
  permissions: string[];
}

export function createTestJwt(
  overrides: Partial<TestJwtPayload> = {},
  secret = process.env.JWT_SECRET ?? "proofpay-test-jwt-secret"
): string {
  const payload: TestJwtPayload = {
    userId: createObjectIdString(),
    walletAddress: randomWallet(),
    permissions: ["USER"],
    ...overrides
  };
  const options: SignOptions = { expiresIn: "1h" };

  return jwt.sign(payload, secret, options);
}
