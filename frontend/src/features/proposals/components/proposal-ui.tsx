import { CalendarDays, Clock, CircleDollarSign, UserRound } from "lucide-react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import type { Proposal } from "../../../types/domain";
import { formatWalletAddress } from "../../../utils/wallet";
import { formatDate, StatusBadge } from "../../projects/components/project-ui";

interface ProposalCardProps {
  proposal: Proposal;
  canEdit?: boolean;
  canWithdraw?: boolean;
  canAccept?: boolean;
  isConversationOpen?: boolean;
  isBusy?: boolean;
  onEdit?: () => void;
  onWithdraw?: () => void;
  onAccept?: () => void;
  onOpenConversation?: () => void;
}

export function ProposalCard({
  canAccept,
  canEdit,
  canWithdraw,
  isConversationOpen,
  isBusy,
  onAccept,
  onEdit,
  onOpenConversation,
  onWithdraw,
  proposal
}: ProposalCardProps): JSX.Element {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-950">{formatWalletAddress(proposal.freelancerWallet)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{proposal.coverLetter}</p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>
      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"><CircleDollarSign size={16} className="text-emerald-600" />{proposal.proposedBudget}</span>
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"><Clock size={16} className="text-indigo-600" />{proposal.estimatedDuration}</span>
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"><UserRound size={16} className="text-slate-500" />{formatWalletAddress(proposal.freelancerWallet)}</span>
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"><CalendarDays size={16} className="text-slate-500" />{formatDate(proposal.createdAt)}</span>
      </div>
      {(onOpenConversation || canEdit || canWithdraw || canAccept) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {onOpenConversation && (
            <Button
              type="button"
              onClick={onOpenConversation}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isConversationOpen ? "Close Conversation" : "Open Conversation"}
            </Button>
          )}
          {canEdit && <Button type="button" disabled={isBusy} onClick={onEdit} className="bg-slate-900 hover:bg-slate-800">Update</Button>}
          {canWithdraw && <Button type="button" disabled={isBusy} onClick={onWithdraw} className="bg-red-600 hover:bg-red-700">Withdraw</Button>}
          {canAccept && <Button type="button" disabled={isBusy} onClick={onAccept}>Accept Proposal</Button>}
        </div>
      )}
    </Card>
  );
}
