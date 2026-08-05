import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import type { WalletVerificationResponse } from "../types/domain";

interface LoginInput { walletAddress: string; signMessage: (message: string) => Promise<string>; }

export function useLogin() {
  return useMutation<WalletVerificationResponse, Error, LoginInput>({
    mutationFn: async ({ walletAddress, signMessage }) => {
      const nonce = await authService.requestNonce(walletAddress);
      const signature = await signMessage(nonce.nonce);
      return authService.verifyWalletSignature(walletAddress, signature);
    }
  });
}
