import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { parseUnits } from "ethers";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { ChatPanel } from "../features/chat/components/chat-panel";
import { useEscrows } from "../features/escrow/hooks/use-escrows";
import { AcceptProposalForm } from "../features/proposals/components/accept-proposal-form";
import { useCreateEscrowOnChain, useEnsureTokenApproval } from "../features/escrow/hooks/use-token-approval";
import { ProposalForm } from "../features/proposals/components/proposal-form";
import { ProposalCard } from "../features/proposals/components/proposal-ui";
import { useAcceptProposal, useCreateProposal, useFreelancerProposals, useProjectProposals } from "../features/proposals/hooks/use-proposals";
import { ProjectForm } from "../features/projects/components/project-form";
import { formatDate, ProjectSkeleton, StatusBadge } from "../features/projects/components/project-ui";
import { useCancelProject, useProject, useUpdateProject } from "../features/projects/hooks/use-projects";
import { useAuth } from "../hooks/use-auth";
import type { AcceptProposalInput, BlockchainOperationResponse, CreateProjectInput, CreateProposalInput, Escrow, Proposal } from "../types/domain";
import { getApiErrorMessage } from "../utils/api-error";
import { formatWalletAddress } from "../utils/wallet";

export function ProjectDetailsPage(): JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const project = useProject(projectId);
  const proposals = useProjectProposals(projectId);
  const escrows = useEscrows();
  const freelancerProposals = useFreelancerProposals(user?.walletAddress);
  const createProposal = useCreateProposal();
  const updateProject = useUpdateProject();
  const cancelProject = useCancelProject();
  const acceptProposal = useAcceptProposal();
  const ensureTokenApproval = useEnsureTokenApproval();
  const createEscrowOnChain = useCreateEscrowOnChain();
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [acceptingProposal, setAcceptingProposal] = useState<Proposal | null>(null);
  const [activeConversationProposalId, setActiveConversationProposalId] = useState<string | null>(null);
  const [latestEscrowResult, setLatestEscrowResult] = useState<BlockchainOperationResponse | null>(null);
  const [approvalTransactionHash, setApprovalTransactionHash] = useState<string | null>(null);

  const isClient = Boolean(project.data && user?.walletAddress.toLowerCase() === project.data.clientWallet.toLowerCase());
  const existingProposal = useMemo(
    () => freelancerProposals.data?.find((proposal) => proposal.projectId === projectId),
    [freelancerProposals.data, projectId]
  );
  const escrowsByProposalId = useMemo(() => {
    const byProposalId = new Map<string, Escrow>();

    for (const escrow of escrows.data ?? []) {
      byProposalId.set(escrow.proposalId, escrow);
    }

    if (latestEscrowResult) {
      byProposalId.set(latestEscrowResult.escrow.proposalId, latestEscrowResult.escrow);
    }

    return byProposalId;
  }, [escrows.data, latestEscrowResult]);
  const canSubmitProposal = Boolean(user && project.data && !isClient && project.data.status === "OPEN" && !existingProposal);

  const handleProjectUpdate = async (input: CreateProjectInput) => {
    if (!projectId) return;
    await updateProject.mutateAsync({ projectId, input });
    setIsEditingProject(false);
  };

  const handleProposalSubmit = async (input: CreateProposalInput) => {
    if (!projectId) return;
    await createProposal.mutateAsync({ projectId, input });
    setIsSubmittingProposal(false);
  };

  const handleAccept = async (input: AcceptProposalInput) => {
    if (!acceptingProposal) return;
    try {
      const baseUnitInput = toMockUsdtBaseUnitInput(input);
      const totalAmount = baseUnitInput.milestones.reduce((total, milestone) => total + BigInt(milestone.amount), 0n).toString();
      const approval = await ensureTokenApproval.mutateAsync({
        tokenAddress: baseUnitInput.tokenAddress,
        amount: totalAmount
      });

      if (approval.transactionHash) {
        toast.success(`USDT approved: ${approval.transactionHash.slice(0, 10)}...`);
      }

      setApprovalTransactionHash(approval.transactionHash ?? null);
      const chainEscrow = await createEscrowOnChain.mutateAsync({
        freelancer: acceptingProposal.freelancerWallet,
        tokenAddress: baseUnitInput.tokenAddress,
        milestoneAmounts: baseUnitInput.milestones.map((milestone) => milestone.amount),
        acceptanceDeadline: baseUnitInput.acceptanceDeadline
      });
      const result = await acceptProposal.mutateAsync({
        proposalId: acceptingProposal.id,
        input: {
          ...baseUnitInput,
          blockchainEscrowId: chainEscrow.blockchainEscrowId,
          transactionHash: chainEscrow.transactionHash
        }
      });
      setLatestEscrowResult(result.escrow);
      setAcceptingProposal(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to approve escrow funding."));
    }
  };

  if (project.isLoading) return <ProjectSkeleton />;
  if (project.isError) return <ErrorState message={getApiErrorMessage(project.error, "Unable to load project.")} />;
  if (!project.data) return <EmptyState title="Project not found" description="The requested project does not exist." />;

  return (
    <section>
      <Link to="/projects" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">Back to projects</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{project.data.title}</h1>
          <p className="mt-2 text-sm text-slate-600">Created {formatDate(project.data.createdAt)}</p>
        </div>
        <StatusBadge status={project.data.status} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-950">Project Details</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.data.description}</p>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Budget" value={`${project.data.budget} ${project.data.currency}`} />
              <Detail label="Expected duration" value={project.data.expectedDuration} />
              <Detail label="Client" value={formatWalletAddress(project.data.clientWallet)} />
              <Detail label="Proposal count" value={String(proposals.data?.length ?? 0)} />
              <Detail label="Milestones" value="Configured when a proposal is accepted." />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {project.data.skills.map((skill) => <span key={skill} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{skill}</span>)}
            </div>
          </Card>

          {isClient && project.data.status === "OPEN" && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setIsEditingProject((current) => !current)} className="bg-slate-900 hover:bg-slate-800">Edit</Button>
              <Button disabled={cancelProject.isPending} onClick={() => void cancelProject.mutateAsync(project.data.id)} className="bg-red-600 hover:bg-red-700">
                {cancelProject.isPending ? "Cancelling..." : "Cancel"}
              </Button>
            </div>
          )}

          {isEditingProject && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Edit Project</h2>
              <ProjectForm project={project.data} submitLabel="Update Project" isSubmitting={updateProject.isPending} onSubmit={handleProjectUpdate} onCancel={() => setIsEditingProject(false)} />
            </Card>
          )}

          {latestEscrowResult && (
            <Card>
              <h2 className="text-lg font-semibold">Escrow Created</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Confirmation status" value="Confirmed" />
                <Detail label="Escrow ID" value={latestEscrowResult.escrow.blockchainEscrowId} />
                <Detail label="Transaction hash" value={latestEscrowResult.transactionHash} />
                {approvalTransactionHash && <Detail label="Approval hash" value={approvalTransactionHash} />}
                <Detail label="Gas used" value="Not returned by backend response" />
              </dl>
              <Link
                to={`/escrows/${latestEscrowResult.escrow.blockchainEscrowId}`}
                className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Open Escrow Workspace
              </Link>
            </Card>
          )}

          {!isClient && project.data.status === "OPEN" && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Submit Proposal</h2>
                  {existingProposal && <p className="mt-1 text-sm text-slate-600">You already submitted a proposal for this project.</p>}
                </div>
                {canSubmitProposal && <Button onClick={() => setIsSubmittingProposal((current) => !current)}>{isSubmittingProposal ? "Close" : "Submit Proposal"}</Button>}
              </div>
              {isSubmittingProposal && (
                <div className="mt-4">
                  <ProposalForm submitLabel="Submit Proposal" isSubmitting={createProposal.isPending} onSubmit={handleProposalSubmit} onCancel={() => setIsSubmittingProposal(false)} />
                </div>
              )}
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold">Proposals</h2>
            <p className="mt-2 text-sm text-slate-600">{isClient ? "Review proposals submitted for your project." : "Proposal visibility is provided by the backend for authenticated users."}</p>
          </Card>
          {proposals.isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />}
          {proposals.isError && <ErrorState message={getApiErrorMessage(proposals.error, "Unable to load proposals.")} />}
          {proposals.data?.length === 0 && <EmptyState title="No proposals" description="This project has not received proposals yet." />}
          {proposals.data?.map((proposal) => {
            const proposalEscrow = escrowsByProposalId.get(proposal.id);
            const proposalChatMovedToEscrow = Boolean(
              proposal.status === "CLOSED" ||
              (proposalEscrow && proposalEscrow.status !== "PENDING_FREELANCER")
            );
            const isConversationOpen = activeConversationProposalId === proposal.id;

            return (
              <div key={proposal.id} className="space-y-3">
                <ProposalCard
                  proposal={proposal}
                  canAccept={isClient && proposal.status === "PENDING" && project.data.status === "OPEN"}
                  isBusy={acceptProposal.isPending || ensureTokenApproval.isPending || createEscrowOnChain.isPending}
                  isConversationOpen={isConversationOpen}
                  onAccept={() => setAcceptingProposal(proposal)}
                  onOpenConversation={() =>
                    setActiveConversationProposalId((current) => (current === proposal.id ? null : proposal.id))
                  }
                />
                {acceptingProposal?.id === proposal.id && <AcceptProposalForm isSubmitting={acceptProposal.isPending || ensureTokenApproval.isPending || createEscrowOnChain.isPending} onSubmit={handleAccept} onCancel={() => setAcceptingProposal(null)} />}
                {isConversationOpen && (
                  <ChatPanel
                    chatType="PROPOSAL"
                    referenceId={proposal.id}
                    readOnly={proposalChatMovedToEscrow}
                    readOnlyMessage="Escrow created. Continue conversation in Escrow Chat."
                    readOnlyAction={
                      proposalEscrow ? (
                        <Link
                          to={`/escrows/${proposalEscrow.blockchainEscrowId}`}
                          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                        >
                          Open Escrow Workspace
                        </Link>
                      ) : undefined
                    }
                  />
                )}
              </div>
            );
          })}
        </aside>
      </div>
    </section>
  );
}

function toMockUsdtBaseUnitInput(input: AcceptProposalInput): AcceptProposalInput {
  return {
    ...input,
    milestones: input.milestones.map((milestone) => ({
      ...milestone,
      amount: parseUnits(milestone.amount, 6).toString()
    }))
  };
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-900">{value}</dd>
    </div>
  );
}
