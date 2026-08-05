import type { User } from "../../src/models/user/user.types";
import { randomEmail, randomWallet } from "../utils";

export type UserFactoryData = Omit<User, "createdAt" | "updatedAt">;

export function buildUser(overrides: Partial<UserFactoryData> = {}): UserFactoryData {
  return {
    walletAddress: randomWallet(),
    displayName: "ProofPay Test User",
    email: randomEmail(),
    permissions: ["USER"],
    ...overrides
  };
}
