import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function AppLogo(): JSX.Element {
  return (
    <Link to="/dashboard" className="group flex items-center gap-3 font-semibold text-slate-950">
      <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20 transition group-hover:scale-105">
        <ShieldCheck size={21} />
      </span>
      <span>
        <span className="block text-lg leading-none">ProofPay</span>
        <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Escrow Network</span>
      </span>
    </Link>
  );
}
