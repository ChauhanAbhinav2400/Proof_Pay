import { Blocks, CalendarClock, CircleDollarSign, Hash, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../../components/card";
import type { Escrow } from "../../../types/domain";
import { formatMockUsdtAmount } from "../../../utils/token-format";
import { formatWalletAddress } from "../../../utils/wallet";
import { formatDate, StatusBadge } from "../../projects/components/project-ui";

export function EscrowCard({ escrow }: { escrow: Escrow }): JSX.Element {
  const currentMilestone = escrow.milestones.findIndex((milestone) => milestone.status !== "RELEASED");
  const milestoneIndex = currentMilestone === -1 ? escrow.milestones.length : currentMilestone;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to={`/escrows/${escrow.blockchainEscrowId}`} className="text-lg font-semibold text-slate-950 hover:text-indigo-700">
            Escrow #{escrow.blockchainEscrowId}
          </Link>
          <p className="mt-1 text-sm text-slate-600">Project {escrow.projectId}</p>
        </div>
        <StatusBadge status={escrow.status} />
      </div>
      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="flex items-center gap-2"><CircleDollarSign size={16} />{formatMockUsdtAmount(escrow.totalAmount)}</span>
        <span className="flex items-center gap-2"><Blocks size={16} />Milestone {Math.min(milestoneIndex + 1, escrow.milestones.length)} of {escrow.milestones.length}</span>
        <span className="flex items-center gap-2"><UserRound size={16} />Client {formatWalletAddress(escrow.clientWallet)}</span>
        <span className="flex items-center gap-2"><UserRound size={16} />Freelancer {formatWalletAddress(escrow.freelancerWallet)}</span>
        <span className="flex items-center gap-2"><Hash size={16} />{formatWalletAddress(escrow.tokenAddress)}</span>
        <span className="flex items-center gap-2"><CalendarClock size={16} />{formatDate(escrow.createdAt)}</span>
      </div>
      {escrow.transactionHash && <p className="mt-4 break-all font-mono text-xs text-slate-500">Tx {escrow.transactionHash}</p>}
    </Card>
  );
}

export function EscrowSkeleton(): JSX.Element {
  return <div className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white" />;
}
