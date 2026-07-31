import type { AuthTokenPayload } from "../../utils/jwt";
import type { UserRecord } from "../../repositories/user";

export interface AuthUserResponse {
  id: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  permissions: UserRecord["permissions"];
  createdAt: Date;
  updatedAt: Date;
}

export interface NonceResponse {
  nonce: string;
}

export interface VerifyWalletResponse {
  token: string;
  user: AuthUserResponse;
}

export type VerifiedAccessToken = AuthTokenPayload;
