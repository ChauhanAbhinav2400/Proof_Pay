import { useWallet } from "./use-wallet";

export function useWalletAddress(): string | undefined { return useWallet().walletAddress; }
