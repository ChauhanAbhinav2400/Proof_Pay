import { apiClient } from "./client";
import type { AuthNonceResponse, WalletVerificationResponse } from "../types/domain";

export function requestNonce(walletAddress: string): Promise<AuthNonceResponse> {
  return apiClient.post<AuthNonceResponse>("/auth/nonce", { walletAddress }).then(({ data }) => data);
}

export function verifyWalletSignature(
  walletAddress: string,
  signature: string
): Promise<WalletVerificationResponse> {
  return apiClient.post<WalletVerificationResponse>("/auth/verify", { walletAddress, signature }).then(({ data }) => data);
}
