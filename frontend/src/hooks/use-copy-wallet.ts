import toast from "react-hot-toast";
import { copyWalletAddress } from "../utils/wallet";

export function useCopyWallet() {
  return async (address: string) => { await copyWalletAddress(address); toast.success("Wallet address copied."); };
}
