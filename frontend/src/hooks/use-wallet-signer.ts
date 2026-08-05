import { useWallet } from "./use-wallet";

export function useWalletSigner() { const { signMessage, walletClient } = useWallet(); return { signMessage, walletClient }; }
