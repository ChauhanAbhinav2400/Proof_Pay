import { useState } from "react";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { ProposalForm } from "../features/proposals/components/proposal-form";
import { ProposalCard } from "../features/proposals/components/proposal-ui";
import { useFreelancerProposals, useUpdateProposal, useWithdrawProposal } from "../features/proposals/hooks/use-proposals";
import { useAuth } from "../hooks/use-auth";
import type { Proposal, UpdateProposalInput } from "../types/domain";
import { getApiErrorMessage } from "../utils/api-error";

export function MyWorkPage(): JSX.Element {
  const { user } = useAuth();
  const proposals = useFreelancerProposals(user?.walletAddress);
  const updateProposal = useUpdateProposal();
  const withdrawProposal = useWithdrawProposal();
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const handleUpdate = async (input: UpdateProposalInput) => {
    if (!editingProposal) return;
    await updateProposal.mutateAsync({ proposalId: editingProposal.id, input });
    setEditingProposal(null);
  };

  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-950">My Work</h1>
      <p className="mt-2 text-sm text-slate-600">Your submitted proposals across ProofPay projects.</p>
      {editingProposal && (
        <div className="mt-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Update Proposal</h2>
            <ProposalForm proposal={editingProposal} submitLabel="Update Proposal" isSubmitting={updateProposal.isPending} onSubmit={handleUpdate} onCancel={() => setEditingProposal(null)} />
          </Card>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {proposals.isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />}
        {proposals.isError && <ErrorState message={getApiErrorMessage(proposals.error, "Unable to load proposals.")} />}
        {proposals.data?.length === 0 && <EmptyState title="No proposals yet" description="Submit a proposal from an open project to see it here." />}
        {proposals.data?.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            canEdit={proposal.status === "PENDING"}
            canWithdraw={proposal.status === "PENDING"}
            isBusy={updateProposal.isPending || withdrawProposal.isPending}
            onEdit={() => setEditingProposal(proposal)}
            onWithdraw={() => void withdrawProposal.mutateAsync(proposal.id)}
          />
        ))}
      </div>
    </section>
  );
}
