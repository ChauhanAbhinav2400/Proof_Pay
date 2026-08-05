import { Copy, LogOut, RadioTower, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { Button } from "./button";
import { WalletButton } from "./wallet-button";
import { useCopyWallet } from "../hooks/use-copy-wallet";
import { formatWalletAddress } from "../utils/wallet";

export function Topbar(): JSX.Element {
  const { user, wallet, logout } = useAuth();
  const copyWallet = useCopyWallet();
  const address = wallet ?? user?.walletAddress;
  return (
    <header className="z-30 shrink-0 border-b border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 sm:hidden">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck size={17} />
            </span>
            ProofPay
          </div>
          <div className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 sm:flex">
            <RadioTower size={14} />
            ProofPay Live
          </div>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">
            Secure freelance workspaces with wallet identity and escrowed
            payments.
          </p>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <span className="hidden max-w-52 truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm md:block">
            {user?.displayName ??
              (address ? formatWalletAddress(address) : "Guest")}
          </span>
          {address && (
            <Button
              aria-label="Copy wallet address"
              className="bg-white px-3 text-slate-700  cursor-pointer shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={() => void copyWallet(address)}
            >
              <Copy size={16} color={"#000"} />
            </Button>
          )}
          {/* <WalletButton /> */}
          {user && (
            <Button
              className="bg-slate-950 px-3 cursor-pointer hover:bg-slate-800 sm:px-4"
              onClick={logout}
            >
              <LogOut size={16} />
              <span className="ml-1 hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
