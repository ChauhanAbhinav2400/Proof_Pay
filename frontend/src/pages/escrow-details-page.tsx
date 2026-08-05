import { Link, useParams } from "react-router-dom";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { ChatPanel } from "../features/chat/components/chat-panel";
import {
  ResolveDisputeForm,
  type ResolveDisputeFormInput,
} from "../features/escrow/components/escrow-action-forms";
import { EscrowSkeleton } from "../features/escrow/components/escrow-ui";
import {
  useApproveMilestone,
  useAcceptEscrow,
  useCancelEscrow,
  useEscrow,
  useRaiseDispute,
  useResolveDispute,
  useSubmitMilestone,
} from "../features/escrow/hooks/use-escrows";
import {
  useRaiseDisputeOnChain,
  useSignAcceptEscrow,
  useSignApproveMilestone,
  useSignResolveDispute,
} from "../features/escrow/hooks/use-token-approval";
import { useProject } from "../features/projects/hooks/use-projects";
import { useProposal } from "../features/proposals/hooks/use-proposals";
import { useAuth } from "../hooks/use-auth";
import type { EscrowMilestone } from "../types/domain";
import { getApiErrorMessage } from "../utils/api-error";
import { formatMockUsdtAmount } from "../utils/token-format";
import { formatWalletAddress } from "../utils/wallet";
import {
  formatDate,
  StatusBadge,
} from "../features/projects/components/project-ui";

export function EscrowDetailsPage(): JSX.Element {
  const { blockchainEscrowId } = useParams<{ blockchainEscrowId: string }>();
  const { user } = useAuth();
  const escrow = useEscrow(blockchainEscrowId);
  const project = useProject(escrow.data?.projectId);
  const proposal = useProposal(escrow.data?.proposalId);
  const approveMilestone = useApproveMilestone();
  const submitMilestone = useSubmitMilestone();
  const acceptEscrow = useAcceptEscrow();
  const signAcceptEscrow = useSignAcceptEscrow();
  const signApproveMilestone = useSignApproveMilestone();
  const signResolveDispute = useSignResolveDispute();
  const raiseDisputeOnChain = useRaiseDisputeOnChain();
  const raiseDispute = useRaiseDispute();
  const resolveDispute = useResolveDispute();
  const cancelEscrow = useCancelEscrow();

  if (escrow.isLoading) return <EscrowSkeleton />;
  if (escrow.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(escrow.error, "Unable to load escrow.")}
      />
    );
  if (!escrow.data)
    return (
      <EmptyState
        title="Escrow not found"
        description="The requested escrow does not exist."
      />
    );

  const isClient =
    user?.walletAddress.toLowerCase() ===
    escrow.data.clientWallet.toLowerCase();
  const isFreelancer =
    user?.walletAddress.toLowerCase() ===
    escrow.data.freelancerWallet.toLowerCase();
  const activeMilestoneIndex = escrow.data.milestones.findIndex(
    (milestone) => milestone.status !== "RELEASED",
  );
  const currentMilestoneIndex =
    activeMilestoneIndex === -1
      ? escrow.data.milestones.length - 1
      : activeMilestoneIndex;
  const canOperate =
    escrow.data.status !== "COMPLETED" && escrow.data.status !== "CANCELLED";
  const canAcceptEscrow =
    escrow.data.status === "PENDING_FREELANCER" && isFreelancer;
  const canUseActiveEscrowActions = escrow.data.status === "ACTIVE";
  const canCancelEscrow =
    escrow.data.status === "PENDING_FREELANCER" && isClient;
  const currentMilestone =
    currentMilestoneIndex >= 0
      ? escrow.data.milestones[currentMilestoneIndex]
      : undefined;
  const canSubmitCurrentMilestone =
    canUseActiveEscrowActions &&
    isFreelancer &&
    currentMilestone?.status !== "SUBMITTED";
  const canApproveCurrentMilestone =
    canUseActiveEscrowActions &&
    isClient &&
    currentMilestone?.status === "SUBMITTED";

  const submitMilestoneForReview = async () => {
    if (!blockchainEscrowId || currentMilestoneIndex < 0) return;
    await submitMilestone.mutateAsync({
      blockchainEscrowId,
      milestoneIndex: currentMilestoneIndex,
    });
  };

  const approveCurrentMilestone = async () => {
    if (!blockchainEscrowId || currentMilestoneIndex < 0) return;
    const signature = await signApproveMilestone.mutateAsync({
      blockchainEscrowId,
      clientWallet: escrow.data.clientWallet,
    });
    await approveMilestone.mutateAsync({
      blockchainEscrowId,
      milestoneIndex: currentMilestoneIndex,
      input: signature,
    });
  };

  const submitResolve = async (input: ResolveDisputeFormInput) => {
    if (!blockchainEscrowId) return;
    const signature = await signResolveDispute.mutateAsync({
      blockchainEscrowId,
      freelancerAward: input.freelancerAward,
      clientRefund: input.clientRefund,
    });
    await resolveDispute.mutateAsync({
      blockchainEscrowId,
      input: { ...input, ...signature },
    });
  };

  const submitRaiseDispute = async () => {
    if (!blockchainEscrowId) return;
    const result = await raiseDisputeOnChain.mutateAsync({
      blockchainEscrowId,
      clientWallet: escrow.data.clientWallet,
      freelancerWallet: escrow.data.freelancerWallet,
    });
    await raiseDispute.mutateAsync({
      blockchainEscrowId,
      input: { transactionHash: result.transactionHash },
    });
  };

  const submitAcceptEscrow = async () => {
    if (!blockchainEscrowId) return;
    const signature = await signAcceptEscrow.mutateAsync({
      blockchainEscrowId,
      freelancerWallet: escrow.data.freelancerWallet,
    });
    await acceptEscrow.mutateAsync({ blockchainEscrowId, input: signature });
  };

  return (
    <section>
      <Link
        to="/escrows"
        className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
      >
        Back to escrows
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Escrow #{escrow.data.blockchainEscrowId}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Created {formatDate(escrow.data.createdAt)}
          </p>
        </div>
        <StatusBadge status={escrow.data.status} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold">Blockchain Information</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Detail
                label="Escrow ID"
                value={escrow.data.blockchainEscrowId}
              />
              <Detail label="Payment token" value={escrow.data.tokenAddress} />
              <Detail
                label="Total amount"
                value={formatMockUsdtAmount(escrow.data.totalAmount)}
              />
              <Detail
                label="Transaction hash"
                value={escrow.data.transactionHash ?? "Not available"}
              />
              <Detail
                label="Client"
                value={formatWalletAddress(escrow.data.clientWallet)}
              />
              <Detail
                label="Freelancer"
                value={formatWalletAddress(escrow.data.freelancerWallet)}
              />
            </dl>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">Project and Proposal</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Detail
                label="Project"
                value={project.data?.title ?? escrow.data.projectId}
              />
              <Detail
                label="Proposal"
                value={proposal.data?.proposedBudget ?? escrow.data.proposalId}
              />
              <Detail
                label="Proposal status"
                value={proposal.data?.status ?? "Loading"}
              />
              <Detail label="Escrow status" value={escrow.data.status} />
            </dl>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">Milestone Timeline</h2>
            <div className="mt-4 space-y-3">
              {escrow.data.milestones.map((milestone, index) => (
                <div
                  key={`${milestone.title}-${index}`}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">
                        {index + 1}. {milestone.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {milestone.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={getMilestoneDisplayStatus(
                          milestone,
                          index,
                          currentMilestoneIndex,
                          escrow.data.status,
                        )}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    Amount: {formatMockUsdtAmount(milestone.amount)}
                  </p>
                  {milestone.submittedAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted {formatDate(milestone.submittedAt)}
                    </p>
                  )}
                  {milestone.releasedAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      Payment released {formatDate(milestone.releasedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <ChatPanel
            chatType="ESCROW"
            referenceId={escrow.data.blockchainEscrowId}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold">Actions</h2>
            <p className="mt-2 text-sm text-slate-600">
              Actions are shown only when the existing backend route can process
              them.
            </p>
            {canOperate && (isClient || isFreelancer) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {canAcceptEscrow && (
                  <Button
                    disabled={
                      acceptEscrow.isPending || signAcceptEscrow.isPending
                    }
                    onClick={() => void submitAcceptEscrow()}
                  >
                    {acceptEscrow.isPending || signAcceptEscrow.isPending
                      ? "Accepting..."
                      : "Accept Escrow"}
                  </Button>
                )}
                {canSubmitCurrentMilestone && (
                  <Button
                    disabled={submitMilestone.isPending}
                    onClick={() => void submitMilestoneForReview()}
                  >
                    {submitMilestone.isPending
                      ? "Submitting..."
                      : "Mark Milestone Completed"}
                  </Button>
                )}
                {canApproveCurrentMilestone && (
                  <Button
                    disabled={
                      approveMilestone.isPending ||
                      signApproveMilestone.isPending
                    }
                    onClick={() => void approveCurrentMilestone()}
                  >
                    {approveMilestone.isPending ||
                    signApproveMilestone.isPending
                      ? "Approving..."
                      : "Approve Milestone"}
                  </Button>
                )}
                {canUseActiveEscrowActions && (
                  <Button
                    disabled={
                      raiseDispute.isPending || raiseDisputeOnChain.isPending
                    }
                    onClick={() => void submitRaiseDispute()}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {raiseDispute.isPending || raiseDisputeOnChain.isPending
                      ? "Raising..."
                      : "Raise Dispute"}
                  </Button>
                )}
                {canCancelEscrow && (
                  <Button
                    disabled={cancelEscrow.isPending}
                    onClick={() =>
                      blockchainEscrowId &&
                      void cancelEscrow.mutateAsync(blockchainEscrowId)
                    }
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Cancel Escrow
                  </Button>
                )}
              </div>
            )}
          </Card>

          {escrow.data.status === "DISPUTED" &&
            user?.permissions.includes("ARBITRATOR") && (
              <ResolveDisputeForm
                isSubmitting={
                  resolveDispute.isPending || signResolveDispute.isPending
                }
                onSubmit={submitResolve}
              />
            )}
        </aside>
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function getMilestoneDisplayStatus(
  milestone: EscrowMilestone,
  index: number,
  currentMilestoneIndex: number,
  escrowStatus: string,
): string {
  if (milestone.status === "RELEASED") return "COMPLETED";
  if (milestone.status === "SUBMITTED") return "SUBMITTED";
  if (escrowStatus === "DISPUTED") return "DISPUTED";
  if (index === currentMilestoneIndex && escrowStatus === "ACTIVE")
    return "ACTIVE";

  return "WAITING";
}
