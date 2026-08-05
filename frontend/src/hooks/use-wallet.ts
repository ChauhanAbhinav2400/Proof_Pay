import { BrowserProvider, type Eip1193Provider } from "ethers";
import { useCallback } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";

import { environment } from "../constants/environment";

declare global { interface Window { ethereum?: Eip1193Provider & { isMetaMask?: boolean }; } }

export function useWallet() {
  const account = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const isMetaMaskInstalled = Boolean(window.ethereum?.isMetaMask);

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled) throw new Error("MetaMask is required to connect to ProofPay.");
    const connector = connectors.find((candidate) =>
      candidate.id === "metaMask" || candidate.id === "injected" || candidate.type === "injected" || candidate.name === "MetaMask"
    );
    if (!connector) throw new Error("MetaMask connector is unavailable.");
    await connectAsync({ connector });
  }, [connectAsync, connectors, isMetaMaskInstalled]);

  const signMessage = useCallback(async (message: string) => {
    if (!window.ethereum) throw new Error("MetaMask is required to sign this message.");
    const signer = await new BrowserProvider(window.ethereum).getSigner();
    return signer.signMessage(message);
  }, []);

  const switchNetwork = useCallback(async () => {
    await switchChainAsync({ chainId: environment.chainId });
  }, [switchChainAsync]);

  return {
    connect,
    disconnect,
    walletAddress: account.address,
    chainId: account.chainId,
    isConnected: account.isConnected,
    isConnecting: isConnecting || isSwitching,
    isMetaMaskInstalled,
    isWrongNetwork: Boolean(account.chainId && account.chainId !== environment.chainId),
    signMessage,
    switchNetwork,
    walletClient,
    publicClient
  };
}
