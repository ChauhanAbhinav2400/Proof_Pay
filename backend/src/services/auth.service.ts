import { authService } from "./auth";
import type {
  NonceResponse,
  VerifyWalletResponse
} from "./auth";

export interface NonceRequestInput {
  walletAddress: string;
}

export interface VerifyWalletSignatureInput {
  walletAddress: string;
  signature: string;
}

export function requestNonce(input: NonceRequestInput): Promise<NonceResponse> {
  return authService.requestNonce(input.walletAddress);
}

export function verifyWalletSignature(
  input: VerifyWalletSignatureInput
): Promise<VerifyWalletResponse> {
  return authService.verifyWalletSignature(input.walletAddress, input.signature);
}
