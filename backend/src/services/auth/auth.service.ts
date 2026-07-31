import { randomBytes } from "crypto";
import { getAddress, verifyMessage } from "ethers";

import { nonceChallengeRepository } from "../../repositories/nonce-challenge";
import { userRepository } from "../../repositories/user";
import type { UserRecord } from "../../repositories/user";
import { AppError } from "../../utils/AppError";
import { generateToken, verifyToken } from "../../utils/jwt";
import type {
  AuthUserResponse,
  NonceResponse,
  VerifiedAccessToken,
  VerifyWalletResponse
} from "./auth.types";

const NONCE_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function requestNonce(walletAddress: string): Promise<NonceResponse> {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
  const nonce = randomBytes(32).toString("hex");

  await nonceChallengeRepository.upsertNonceChallenge({
    walletAddress: normalizedWalletAddress,
    nonce,
    expiresAt: new Date(Date.now() + NONCE_CHALLENGE_TTL_MS)
  });

  return { nonce };
}

export async function verifyWalletSignature(
  walletAddress: string,
  signature: string
): Promise<VerifyWalletResponse> {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
  const challenge = await nonceChallengeRepository.findActiveNonceChallenge(
    normalizedWalletAddress
  );

  if (!challenge) {
    throw new AppError("Nonce challenge not found or expired.", 401);
  }

  if (recoverSigner(challenge.nonce, signature) !== normalizedWalletAddress) {
    throw new AppError("Invalid signature.", 401);
  }

  const consumedChallenge = await nonceChallengeRepository.consumeNonceChallenge(
    normalizedWalletAddress,
    challenge.nonce
  );

  if (!consumedChallenge) {
    throw new AppError("Nonce challenge not found or expired.", 401);
  }

  const user = await userRepository.findOrCreateByWalletAddress(
    normalizedWalletAddress
  );

  return {
    token: generateAccessToken(user),
    user: serializeUser(user)
  };
}

export function generateAccessToken(user: UserRecord): string {
  return generateToken({
    userId: user._id.toString(),
    walletAddress: user.walletAddress,
    permissions: [...user.permissions]
  });
}

export function verifyAccessToken(token: string): VerifiedAccessToken {
  try {
    return verifyToken(token);
  } catch {
    throw new AppError("Invalid token.", 401);
  }
}

function normalizeWalletAddress(walletAddress: string): string {
  try {
    return getAddress(walletAddress).toLowerCase();
  } catch {
    throw new AppError("Invalid wallet address.", 400);
  }
}

function recoverSigner(nonce: string, signature: string): string {
  try {
    return normalizeWalletAddress(verifyMessage(nonce, signature));
  } catch {
    throw new AppError("Invalid signature.", 401);
  }
}

function serializeUser(user: UserRecord): AuthUserResponse {
  const response: AuthUserResponse = {
    id: user._id.toString(),
    walletAddress: user.walletAddress,
    permissions: user.permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  if (user.displayName !== undefined) {
    response.displayName = user.displayName;
  }

  if (user.email !== undefined) {
    response.email = user.email;
  }

  if (user.avatarUrl !== undefined) {
    response.avatarUrl = user.avatarUrl;
  }

  return response;
}
