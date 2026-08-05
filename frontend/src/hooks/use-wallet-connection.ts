import { useWallet } from "./use-wallet";

export function useWalletConnection() {
  const { connect, disconnect, isConnected, isConnecting, isMetaMaskInstalled, isWrongNetwork } = useWallet();
  return { connect, disconnect, isConnected, isConnecting, isMetaMaskInstalled, isWrongNetwork };
}
