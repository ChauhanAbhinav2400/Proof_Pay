import { Copy, ExternalLink, LogOut, Network, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { useCopyWallet } from "../hooks/use-copy-wallet";
import { useSwitchNetwork } from "../hooks/use-switch-network";
import { useWallet } from "../hooks/use-wallet";
import { useAuth } from "../hooks/use-auth";
import { formatWalletAddress } from "../utils/wallet";
import { Button } from "./button";

export function WalletButton(): JSX.Element {
  const { connect, walletAddress, chainId, isConnected, isConnecting, isMetaMaskInstalled } = useWallet();
  const { logout } = useAuth();
  const { isWrongNetwork, switchNetwork } = useSwitchNetwork();
  const copyWallet = useCopyWallet();
  if (!isMetaMaskInstalled) return <a href="https://metamask.io/download/" target="_blank" rel="noreferrer"><Button><ExternalLink size={16} /> <span className="ml-1">Install MetaMask</span></Button></a>;
  if (!isConnected) return <Button disabled={isConnecting} onClick={() => void connect().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to connect MetaMask."))}><Wallet size={16} /> <span className="ml-1">{isConnecting ? "Connecting…" : "Connect Wallet"}</span></Button>;
  if (isWrongNetwork) return <Button disabled={isConnecting} onClick={() => void switchNetwork().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to switch network."))}><Network size={16} /> <span className="ml-1">Switch Network</span></Button>;
  return <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700">{walletAddress?.slice(2, 3).toUpperCase()}</span><span>{walletAddress ? formatWalletAddress(walletAddress) : "Connected"}</span><span className="text-xs text-slate-500">{chainId}</span>{walletAddress && <button aria-label="Copy wallet address" onClick={() => void copyWallet(walletAddress)}><Copy size={15} /></button>}<button aria-label="Disconnect wallet" onClick={logout}><LogOut size={15} /></button></div>;
}
