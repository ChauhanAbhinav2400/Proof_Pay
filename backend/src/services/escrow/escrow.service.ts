import { blockchainService } from "../blockchain";
import { startSession } from "mongoose";
import { escrowRepository } from "../../repositories/escrow";
import type {
  CreateEscrowInput as CreateEscrowRepositoryInput,
  EscrowRecord
} from "../../repositories/escrow";
import { projectRepository } from "../../repositories/project";
import type { ProjectRecord } from "../../repositories/project";
import { proposalRepository } from "../../repositories/proposal";
import type { ProposalRecord } from "../../repositories/proposal";
import type {
  ApproveMilestoneInput,
  AcceptEscrowInput,
  BlockchainOperationResponse,
  CancelEscrowInput,
  ConfirmedEscrowCreation,
  CreateEscrowInput,
  CreateEscrowMilestoneInput,
  EscrowMilestone,
  EscrowResponse,
  EscrowStatus,
  ExistingEscrowConfirmationInput,
  GetEscrowByBlockchainIdInput,
  GetEscrowByIdInput,
  GetDisputedEscrowsInput,
  GetFreelancerEscrowsInput,
  GetProjectEscrowInput,
  PersistConfirmedEscrowOptions,
  RaiseDisputeInput,
  ReleaseMilestoneInput,
  ResolveDisputeInput,
  SubmitMilestoneInput
} from "./escrow.types";

export async function createEscrow(
  input: CreateEscrowInput
): Promise<BlockchainOperationResponse> {
  const requesterWallet = requireWalletAddress(input.requesterWallet);
  const project = await getExistingProject(input.projectId);
  const proposal = await getExistingProposal(input.proposalId);

  ensureProjectOwner(project, requesterWallet);
  ensureProjectReadyForEscrow(project);
  ensureProposalBelongsToProject(proposal, project);
  ensureProposalAccepted(proposal);
  await ensureProjectHasNoEscrow(project);

  return createEscrowOnChainAndPersist(input, project, proposal);
}

export async function createEscrowForProposalAcceptance(
  input: CreateEscrowInput
): Promise<BlockchainOperationResponse> {
  const confirmedEscrow = await confirmEscrowCreationForProposalAcceptance(input);

  return persistConfirmedEscrow(confirmedEscrow);
}

export async function confirmEscrowCreationForProposalAcceptance(
  input: CreateEscrowInput
): Promise<ConfirmedEscrowCreation> {
  const requesterWallet = requireWalletAddress(input.requesterWallet);
  const project = await getExistingProject(input.projectId);
  const proposal = await getExistingProposal(input.proposalId);

  ensureProjectOwner(project, requesterWallet);
  ensureProjectAcceptsEscrowCreation(project);
  ensureProposalBelongsToProject(proposal, project);
  ensureProposalPendingAcceptance(proposal);
  await ensureProjectHasNoEscrow(project);

  return createEscrowOnChain(input, project, proposal);
}

export async function confirmExistingEscrowForProposalAcceptance(
  input: CreateEscrowInput,
  existingEscrow: ExistingEscrowConfirmationInput
): Promise<ConfirmedEscrowCreation> {
  const requesterWallet = requireWalletAddress(input.requesterWallet);
  const project = await getExistingProject(input.projectId);
  const proposal = await getExistingProposal(input.proposalId);

  ensureProjectOwner(project, requesterWallet);
  ensureProjectAcceptsEscrowCreation(project);
  ensureProposalBelongsToProject(proposal, project);
  ensureProposalPendingAcceptance(proposal);
  await ensureProjectHasNoEscrow(project);

  return verifyExistingEscrowOnChain(input, project, proposal, existingEscrow);
}

export async function persistConfirmedEscrow(
  confirmedEscrow: ConfirmedEscrowCreation,
  options?: PersistConfirmedEscrowOptions
): Promise<BlockchainOperationResponse> {
  const escrow = await escrowRepository.createEscrow(
    confirmedEscrow.createInput,
    options
  );

  return {
    escrow: toEscrowResponse(escrow),
    transactionHash: confirmedEscrow.transactionHash
  };
}

async function createEscrowOnChainAndPersist(
  input: CreateEscrowInput,
  project: ProjectRecord,
  proposal: ProposalRecord
): Promise<BlockchainOperationResponse> {
  const confirmedEscrow = await createEscrowOnChain(input, project, proposal);

  return persistConfirmedEscrow(confirmedEscrow);
}

async function createEscrowOnChain(
  input: CreateEscrowInput,
  project: ProjectRecord,
  proposal: ProposalRecord
): Promise<ConfirmedEscrowCreation> {
  const milestones = buildMilestones(input.milestones);
  const milestoneAmounts = milestones.map((milestone) => milestone.amount);
  const totalAmount = sumAmounts(milestoneAmounts);
  const tokenAddress = requireText(input.tokenAddress, "Token address is required.");
  const acceptanceDeadline = parseAcceptanceDeadline(
    requireText(
    input.acceptanceDeadline,
    "Acceptance deadline is required."
    )
  );

  const chainResult = await blockchainService.createEscrow({
    freelancer: proposal.freelancerWallet,
    paymentToken: tokenAddress,
    milestoneAmounts,
    acceptanceDeadline
  });

  if (!chainResult.escrowId) {
    throw new Error("Blockchain escrow id was not returned.");
  }

  const chainEscrow = await blockchainService.getEscrow({
    escrowId: chainResult.escrowId
  });

  const createInput: CreateEscrowRepositoryInput = {
    blockchainEscrowId: chainResult.escrowId,
    projectId: project._id,
    proposalId: proposal._id,
    clientWallet: project.clientWallet,
    freelancerWallet: proposal.freelancerWallet,
    tokenAddress,
    totalAmount,
    transactionHash: chainResult.transactionHash,
    status: toRepositoryEscrowStatus(chainEscrow.state),
    milestones
  };

  if (input.attachments !== undefined) {
    createInput.attachments = input.attachments;
  }

  return {
    createInput,
    transactionHash: chainResult.transactionHash
  };
}

async function verifyExistingEscrowOnChain(
  input: CreateEscrowInput,
  project: ProjectRecord,
  proposal: ProposalRecord,
  existingEscrow: ExistingEscrowConfirmationInput
): Promise<ConfirmedEscrowCreation> {
  const milestones = buildMilestones(input.milestones);
  const milestoneAmounts = milestones.map((milestone) => milestone.amount);
  const totalAmount = sumAmounts(milestoneAmounts);
  const tokenAddress = requireText(input.tokenAddress, "Token address is required.").toLowerCase();
  const blockchainEscrowId = requireText(
    existingEscrow.blockchainEscrowId,
    "Blockchain escrow id is required."
  );
  const transactionHash = requireText(
    existingEscrow.transactionHash,
    "Transaction hash is required."
  );
  const chainEscrow = await blockchainService.getEscrow({
    escrowId: blockchainEscrowId
  });

  if (chainEscrow.client.toLowerCase() !== project.clientWallet) {
    throw new Error("On-chain escrow client does not match project client.");
  }

  if (chainEscrow.freelancer.toLowerCase() !== proposal.freelancerWallet) {
    throw new Error("On-chain escrow freelancer does not match proposal freelancer.");
  }

  if (chainEscrow.paymentToken.toLowerCase() !== tokenAddress) {
    throw new Error("On-chain escrow payment token does not match request token.");
  }

  if (chainEscrow.totalAmount !== totalAmount) {
    throw new Error("On-chain escrow amount does not match milestone total.");
  }

  const createInput: CreateEscrowRepositoryInput = {
    blockchainEscrowId,
    projectId: project._id,
    proposalId: proposal._id,
    clientWallet: project.clientWallet,
    freelancerWallet: proposal.freelancerWallet,
    tokenAddress,
    totalAmount,
    transactionHash,
    status: toRepositoryEscrowStatus(chainEscrow.state),
    milestones
  };

  if (input.attachments !== undefined) {
    createInput.attachments = input.attachments;
  }

  return {
    createInput,
    transactionHash
  };
}

export async function getEscrowById(
  input: GetEscrowByIdInput
): Promise<EscrowResponse> {
  const escrowId = requireText(input.escrowId, "Escrow id is required.");
  const escrow = await escrowRepository.findById(escrowId);

  if (!escrow) {
    throw new Error("Escrow not found.");
  }

  return toEscrowResponse(escrow);
}

export async function getEscrowByBlockchainId(
  input: GetEscrowByBlockchainIdInput
): Promise<EscrowResponse> {
  const escrow = await syncEscrowStatusFromChain(
    await getExistingEscrow(input.blockchainEscrowId)
  );

  return toEscrowResponse(escrow);
}

export async function getProjectEscrow(
  input: GetProjectEscrowInput
): Promise<EscrowResponse> {
  const project = await getExistingProject(input.projectId);
  const escrow = await escrowRepository.findByProject(project._id);

  if (!escrow) {
    throw new Error("Project has no escrow.");
  }

  return toEscrowResponse(escrow);
}

export async function getFreelancerEscrows(
  input: GetFreelancerEscrowsInput
): Promise<EscrowResponse[]> {
  const freelancerWallet = requireWalletAddress(input.freelancerWallet);
  const escrows = await escrowRepository.findByParticipantWallet(
    freelancerWallet,
    input.options
  );

  return escrows.map(toEscrowResponse);
}

export async function acceptEscrow(
  input: AcceptEscrowInput
): Promise<BlockchainOperationResponse> {
  const escrow = await getExistingEscrow(input.blockchainEscrowId);
  const requesterWallet = requireWalletAddress(input.requesterWallet);

  ensureEscrowFreelancer(escrow, requesterWallet);

  if (escrow.status !== "PENDING_FREELANCER") {
    throw new Error("Invalid escrow operation.");
  }

  const chainResult = await blockchainService.acceptEscrow({
    escrowId: escrow.blockchainEscrowId,
    deadline: requireText(input.deadline, "Deadline is required."),
    signature: requireText(input.signature, "Signature is required.")
  });
  const session = await startSession();
  let updatedEscrow: EscrowRecord | null = null;

  try {
    await session.withTransaction(async () => {
      updatedEscrow = await escrowRepository.updateStatusWithSession(
        escrow.blockchainEscrowId,
        "ACTIVE",
        session
      );

      if (!updatedEscrow) {
        throw new Error("Escrow not found.");
      }

      await projectRepository.updateStatusWithSession(
        escrow.projectId,
        "IN_PROGRESS",
        session
      );
      await proposalRepository.updateStatusWithSession(
        escrow.proposalId,
        "CLOSED",
        session
      );
    });
  } catch (error) {
    if (!isTransactionUnsupportedError(error)) {
      throw error;
    }

    updatedEscrow = await escrowRepository.updateStatus(
      escrow.blockchainEscrowId,
      "ACTIVE"
    );

    if (!updatedEscrow) {
      throw new Error("Escrow not found.");
    }

    await projectRepository.updateStatus(escrow.projectId, "IN_PROGRESS");
    await proposalRepository.updateStatus(escrow.proposalId, "CLOSED");
  } finally {
    await session.endSession();
  }

  if (!updatedEscrow) {
    throw new Error("Escrow not found.");
  }

  return {
    escrow: toEscrowResponse(updatedEscrow),
    transactionHash: chainResult.transactionHash
  };
}

export async function getDisputedEscrows(
  input: GetDisputedEscrowsInput
): Promise<EscrowResponse[]> {
  const escrows = await escrowRepository.findByStatus("DISPUTED", input.options);

  return escrows.map(toEscrowResponse);
}

export async function approveMilestone(
  input: ApproveMilestoneInput
): Promise<BlockchainOperationResponse> {
  const escrow = await getExistingEscrow(input.blockchainEscrowId);
  const requesterWallet = requireWalletAddress(input.requesterWallet);
  const milestone = getMilestoneForRelease(escrow, input.milestoneIndex);

  ensureEscrowClient(escrow, requesterWallet);
  ensureEscrowCanReleaseMilestone(escrow);
  ensureMilestoneSubmitted(milestone);

  const chainEscrowBefore = await blockchainService.getEscrow({
    escrowId: escrow.blockchainEscrowId
  });
  const balancesBefore = await getMilestoneTokenBalances(escrow);

  ensureChainEscrowReadyForMilestoneApproval(
    chainEscrowBefore,
    input.milestoneIndex
  );

  const chainResult = await blockchainService.approveMilestone({
    escrowId: escrow.blockchainEscrowId,
    deadline: requireText(input.deadline, "Deadline is required."),
    signature: requireText(input.signature, "Signature is required.")
  });
  const chainEscrow = await blockchainService.getEscrow({
    escrowId: escrow.blockchainEscrowId
  });
  const balancesAfter = await getMilestoneTokenBalances(escrow);

  verifyMilestoneApprovalOnChain({
    escrow,
    milestone,
    milestoneIndex: input.milestoneIndex,
    chainEscrowBefore,
    chainEscrowAfter: chainEscrow,
    balancesBefore,
    balancesAfter
  });

  const updatedEscrow = await updateEscrowAfterMilestoneRelease(
    escrow,
    input.milestoneIndex,
    milestone,
    toRepositoryEscrowStatus(chainEscrow.state)
  );

  return {
    escrow: toEscrowResponse(updatedEscrow),
    transactionHash: chainResult.transactionHash
  };
}

export async function releaseMilestone(
  input: ReleaseMilestoneInput
): Promise<BlockchainOperationResponse> {
  return approveMilestone(input);
}

export async function submitMilestone(
  input: SubmitMilestoneInput
): Promise<EscrowResponse> {
  const escrow = await getExistingEscrow(input.blockchainEscrowId);
  const requesterWallet = requireWalletAddress(input.requesterWallet);
  const milestone = getCurrentMilestoneForSubmission(
    escrow,
    input.milestoneIndex
  );

  ensureEscrowFreelancer(escrow, requesterWallet);
  ensureEscrowCanSubmitMilestone(escrow);

  const updatedMilestones = escrow.milestones.map((currentMilestone, index) =>
    index === input.milestoneIndex
      ? {
          ...milestone,
          status: "SUBMITTED" as const,
          submittedAt: new Date()
        }
      : currentMilestone
  );
  const updatedEscrow = await escrowRepository.updateMilestones(
    escrow.blockchainEscrowId,
    updatedMilestones
  );

  if (!updatedEscrow) {
    throw new Error("Escrow not found.");
  }

  return toEscrowResponse(updatedEscrow);
}

export async function raiseDispute(
  input: RaiseDisputeInput
): Promise<BlockchainOperationResponse> {
  const escrow = await getExistingEscrow(input.blockchainEscrowId);
  const requesterWallet = requireWalletAddress(input.requesterWallet);

  ensureEscrowParticipant(escrow, requesterWallet);

  if (input.transactionHash) {
    const chainResult = await confirmExistingDisputeTransaction(
      escrow,
      input.transactionHash
    );
    const syncedEscrow = await syncEscrowStatusFromChain(escrow);

    if (syncedEscrow.status !== "DISPUTED") {
      throw new Error("Escrow was not synchronized to disputed state.");
    }

    return {
      escrow: toEscrowResponse(syncedEscrow),
      transactionHash: chainResult.transactionHash
    };
  }

  ensureEscrowCanRaiseDispute(escrow);

  const chainResult = await blockchainService.raiseDispute({
    escrowId: escrow.blockchainEscrowId
  });
  const chainEscrow = await blockchainService.getEscrow({
    escrowId: escrow.blockchainEscrowId
  });

  if (chainEscrow.state !== "Disputed") {
    throw new Error(
      `On-chain escrow is not disputed after transaction confirmation. Current state: ${chainEscrow.state}.`
    );
  }

  const updatedEscrow = await escrowRepository.updateStatus(
    escrow.blockchainEscrowId,
    "DISPUTED"
  );

  if (!updatedEscrow) {
    throw new Error("Escrow not found.");
  }

  return {
    escrow: toEscrowResponse(updatedEscrow),
    transactionHash: chainResult.transactionHash
  };
}

async function confirmExistingDisputeTransaction(
  escrow: EscrowRecord,
  transactionHash: string
): Promise<Awaited<ReturnType<typeof blockchainService.waitForTransaction>>["transaction"]> {
  const result = await blockchainService.waitForTransaction({
    transactionHash: requireText(transactionHash, "Transaction hash is required.")
  });
  const chainEscrow = await blockchainService.getEscrow({
    escrowId: escrow.blockchainEscrowId
  });

  if (chainEscrow.state !== "Disputed") {
    throw new Error(
      `On-chain escrow is not disputed after transaction confirmation. Current state: ${chainEscrow.state}.`
    );
  }

  return result.transaction;
}

export async function resolveDispute(
  input: ResolveDisputeInput
): Promise<BlockchainOperationResponse> {
  const escrow = await syncEscrowStatusFromChain(
    await getExistingEscrow(input.blockchainEscrowId)
  );

  if (escrow.status !== "DISPUTED") {
    throw new Error("Invalid escrow operation.");
  }

  const chainEscrowBeforeResolution = await blockchainService.getEscrow({
    escrowId: escrow.blockchainEscrowId
  });

  if (chainEscrowBeforeResolution.state !== "Disputed") {
    throw new Error(
      `On-chain escrow is ${chainEscrowBeforeResolution.state}, not Disputed. Refresh the escrow and raise a dispute first.`
    );
  }

  const chainResult = await blockchainService.resolveDispute({
    escrowId: escrow.blockchainEscrowId,
    arbitrator: requireWalletAddress(input.arbitrator),
    freelancerAward: requireText(input.freelancerAward, "Freelancer award is required."),
    clientRefund: requireText(input.clientRefund, "Client refund is required."),
    deadline: requireText(input.deadline, "Deadline is required."),
    signature: requireText(input.signature, "Signature is required.")
  });
  const updatedEscrow = await escrowRepository.updateStatus(
    escrow.blockchainEscrowId,
    "COMPLETED"
  );

  if (!updatedEscrow) {
    throw new Error("Escrow not found.");
  }

  return {
    escrow: toEscrowResponse(updatedEscrow),
    transactionHash: chainResult.transactionHash
  };
}

export async function cancelEscrow(
  input: CancelEscrowInput
): Promise<BlockchainOperationResponse> {
  const escrow = await getExistingEscrow(input.blockchainEscrowId);
  const requesterWallet = requireWalletAddress(input.requesterWallet);

  ensureEscrowClient(escrow, requesterWallet);
  ensureEscrowCanCancel(escrow);

  const chainResult = await blockchainService.cancelEscrow({
    escrowId: escrow.blockchainEscrowId
  });
  const updatedEscrow = await escrowRepository.updateStatus(
    escrow.blockchainEscrowId,
    "CANCELLED"
  );

  if (!updatedEscrow) {
    throw new Error("Escrow not found.");
  }

  return {
    escrow: toEscrowResponse(updatedEscrow),
    transactionHash: chainResult.transactionHash
  };
}

export async function escrowExists(blockchainEscrowId: string): Promise<boolean> {
  const normalizedEscrowId = requireText(
    blockchainEscrowId,
    "Blockchain escrow id is required."
  );

  return escrowRepository.exists(normalizedEscrowId);
}

async function updateEscrowAfterMilestoneRelease(
  escrow: EscrowRecord,
  milestoneIndex: number,
  milestone: EscrowMilestone,
  status: EscrowStatus
): Promise<EscrowRecord> {
  const updatedMilestones = escrow.milestones.map((currentMilestone, index) =>
    index === milestoneIndex
      ? {
          ...milestone,
          status: "RELEASED" as const,
          approvedAt: new Date(),
          releasedAt: new Date()
        }
      : currentMilestone
  );

  const updatedEscrow = await escrowRepository.updateEscrow(
    escrow.blockchainEscrowId,
    {
      status,
      milestones: updatedMilestones
    }
  );

  if (!updatedEscrow) {
    throw new Error("Escrow not found.");
  }

  return updatedEscrow;
}

async function syncEscrowStatusFromChain(
  escrow: EscrowRecord
): Promise<EscrowRecord> {
  const chainEscrow = await blockchainService.getEscrow({
    escrowId: escrow.blockchainEscrowId
  });
  const chainStatus = toRepositoryEscrowStatus(chainEscrow.state);

  if (escrow.status === chainStatus) {
    return escrow;
  }

  const updatedEscrow = await escrowRepository.updateStatus(
    escrow.blockchainEscrowId,
    chainStatus
  );

  if (!updatedEscrow) {
    throw new Error("Escrow not found.");
  }

  return updatedEscrow;
}

interface MilestoneTokenBalances {
  client: bigint;
  freelancer: bigint;
  escrowContract: bigint;
}

async function getMilestoneTokenBalances(
  escrow: EscrowRecord
): Promise<MilestoneTokenBalances> {
  const escrowContractAddress = blockchainService.getProofPayEscrowAddress();
  const [client, freelancer, escrowContract] = await Promise.all([
    blockchainService.getTokenBalance({
      tokenAddress: escrow.tokenAddress,
      account: escrow.clientWallet
    }),
    blockchainService.getTokenBalance({
      tokenAddress: escrow.tokenAddress,
      account: escrow.freelancerWallet
    }),
    blockchainService.getTokenBalance({
      tokenAddress: escrow.tokenAddress,
      account: escrowContractAddress
    })
  ]);

  return {
    client: BigInt(client),
    freelancer: BigInt(freelancer),
    escrowContract: BigInt(escrowContract)
  };
}

function ensureChainEscrowReadyForMilestoneApproval(
  chainEscrow: Awaited<ReturnType<typeof blockchainService.getEscrow>>,
  milestoneIndex: number
): void {
  if (chainEscrow.state !== "Active") {
    throw new Error(
      `On-chain escrow is not active. Current state: ${chainEscrow.state}.`
    );
  }

  if (chainEscrow.currentMilestone !== milestoneIndex) {
    throw new Error(
      `On-chain current milestone mismatch. Expected ${milestoneIndex}, got ${chainEscrow.currentMilestone}.`
    );
  }
}

function verifyMilestoneApprovalOnChain(input: {
  escrow: EscrowRecord;
  milestone: EscrowMilestone;
  milestoneIndex: number;
  chainEscrowBefore: Awaited<ReturnType<typeof blockchainService.getEscrow>>;
  chainEscrowAfter: Awaited<ReturnType<typeof blockchainService.getEscrow>>;
  balancesBefore: MilestoneTokenBalances;
  balancesAfter: MilestoneTokenBalances;
}): void {
  const expectedAmount = BigInt(input.milestone.amount);
  const expectedCurrentMilestone = input.chainEscrowBefore.currentMilestone + 1;

  if (input.chainEscrowAfter.currentMilestone !== expectedCurrentMilestone) {
    throw new Error(
      `On-chain milestone did not advance. Expected ${expectedCurrentMilestone}, got ${input.chainEscrowAfter.currentMilestone}.`
    );
  }

  const expectedState =
    expectedCurrentMilestone === input.escrow.milestones.length
      ? "Completed"
      : "Active";

  if (input.chainEscrowAfter.state !== expectedState) {
    throw new Error(
      `On-chain escrow state mismatch after milestone approval. Expected ${expectedState}, got ${input.chainEscrowAfter.state}.`
    );
  }

  if (
    input.balancesAfter.freelancer !==
    input.balancesBefore.freelancer + expectedAmount
  ) {
    throw new Error("Freelancer token balance did not increase by the milestone amount.");
  }

  if (
    input.balancesAfter.escrowContract !==
    input.balancesBefore.escrowContract - expectedAmount
  ) {
    throw new Error("Escrow contract token balance did not decrease by the milestone amount.");
  }

  if (input.balancesAfter.client !== input.balancesBefore.client) {
    throw new Error("Client token balance changed during milestone approval.");
  }
}

async function ensureProjectHasNoEscrow(project: ProjectRecord): Promise<void> {
  const escrow = await escrowRepository.findByProject(project._id);

  if (escrow) {
    throw new Error("Invalid escrow operation.");
  }
}

async function getExistingProject(projectId: string): Promise<ProjectRecord> {
  const normalizedProjectId = requireText(projectId, "Project id is required.");
  const project = await projectRepository.findById(normalizedProjectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  return project;
}

async function getExistingProposal(proposalId: string): Promise<ProposalRecord> {
  const normalizedProposalId = requireText(
    proposalId,
    "Proposal id is required."
  );
  const proposal = await proposalRepository.findById(normalizedProposalId);

  if (!proposal) {
    throw new Error("Proposal not found.");
  }

  return proposal;
}

async function getExistingEscrow(
  blockchainEscrowId: string
): Promise<EscrowRecord> {
  const normalizedEscrowId = requireText(
    blockchainEscrowId,
    "Blockchain escrow id is required."
  );
  const escrow = await escrowRepository.findByBlockchainEscrowId(
    normalizedEscrowId
  );

  if (!escrow) {
    throw new Error("Escrow not found.");
  }

  return escrow;
}

function ensureProjectOwner(
  project: ProjectRecord,
  requesterWallet: string
): void {
  if (project.clientWallet !== requesterWallet) {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureProjectReadyForEscrow(project: ProjectRecord): void {
  if (project.status !== "ESCROW_CREATED") {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureProjectAcceptsEscrowCreation(project: ProjectRecord): void {
  if (project.status !== "OPEN") {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureProposalBelongsToProject(
  proposal: ProposalRecord,
  project: ProjectRecord
): void {
  if (proposal.projectId.toString() !== project._id.toString()) {
    throw new Error("Escrow must belong to the project.");
  }
}

function ensureProposalAccepted(proposal: ProposalRecord): void {
  if (proposal.status !== "ACCEPTED") {
    throw new Error("Proposal not accepted.");
  }
}

function ensureProposalPendingAcceptance(proposal: ProposalRecord): void {
  if (proposal.status !== "PENDING") {
    throw new Error("Proposal already processed.");
  }
}

function ensureEscrowParticipant(
  escrow: EscrowRecord,
  requesterWallet: string
): void {
  if (
    requesterWallet !== escrow.clientWallet &&
    requesterWallet !== escrow.freelancerWallet
  ) {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureEscrowClient(
  escrow: EscrowRecord,
  requesterWallet: string
): void {
  if (requesterWallet !== escrow.clientWallet) {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureEscrowFreelancer(
  escrow: EscrowRecord,
  requesterWallet: string
): void {
  if (requesterWallet !== escrow.freelancerWallet) {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureEscrowCanReleaseMilestone(escrow: EscrowRecord): void {
  if (escrow.status !== "ACTIVE") {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureEscrowCanSubmitMilestone(escrow: EscrowRecord): void {
  if (escrow.status !== "ACTIVE") {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureEscrowCanRaiseDispute(escrow: EscrowRecord): void {
  if (escrow.status === "DISPUTED") {
    throw new Error("Escrow is disputed.");
  }

  if (escrow.status === "COMPLETED") {
    throw new Error("Escrow already completed.");
  }

  if (escrow.status === "CANCELLED") {
    throw new Error("Invalid escrow operation.");
  }
}

function ensureEscrowCanCancel(escrow: EscrowRecord): void {
  if (escrow.status === "COMPLETED") {
    throw new Error("Escrow already completed.");
  }

  if (escrow.status === "DISPUTED") {
    throw new Error("Escrow is disputed.");
  }

  if (escrow.status === "CANCELLED") {
    throw new Error("Invalid escrow operation.");
  }
}

function getMilestoneForRelease(
  escrow: EscrowRecord,
  milestoneIndex: number
): EscrowMilestone {
  if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0) {
    throw new Error("Milestone index must be valid.");
  }

  const milestone = escrow.milestones[milestoneIndex];

  if (!milestone) {
    throw new Error("Milestone index must be valid.");
  }

  if (milestone.status === "RELEASED") {
    throw new Error("Milestone already released.");
  }

  return milestone;
}

function getCurrentMilestoneForSubmission(
  escrow: EscrowRecord,
  milestoneIndex: number
): EscrowMilestone {
  const currentMilestoneIndex = escrow.milestones.findIndex(
    (milestone) => milestone.status !== "RELEASED"
  );

  if (currentMilestoneIndex === -1) {
    throw new Error("Escrow already completed.");
  }

  if (milestoneIndex !== currentMilestoneIndex) {
    throw new Error("Invalid escrow operation.");
  }

  const milestone = escrow.milestones[milestoneIndex];

  if (!milestone) {
    throw new Error("Milestone index must be valid.");
  }

  if (milestone.status === "RELEASED") {
    throw new Error("Milestone already released.");
  }

  return milestone;
}

function ensureMilestoneSubmitted(milestone: EscrowMilestone): void {
  if (milestone.status !== "SUBMITTED") {
    throw new Error("Milestone must be submitted for review before approval.");
  }
}

function buildMilestones(
  milestones: CreateEscrowMilestoneInput[]
): EscrowMilestone[] {
  if (milestones.length === 0) {
    throw new Error("Invalid escrow operation.");
  }

  return milestones.map((milestone) => ({
    title: requireText(milestone.title, "Milestone title is required."),
    description: requireText(
      milestone.description,
      "Milestone description is required."
    ),
    amount: requirePositiveAmount(milestone.amount),
    status: "PENDING",
    submissionFiles: []
  }));
}

function sumAmounts(amounts: string[]): string {
  return amounts
    .reduce((total, amount) => total + BigInt(amount), 0n)
    .toString();
}

function requirePositiveAmount(amount: string): string {
  const normalizedAmount = requireText(amount, "Milestone amount is required.");
  let parsedAmount: bigint;

  try {
    parsedAmount = BigInt(normalizedAmount);
  } catch {
    throw new Error("Milestone amount is required.");
  }

  if (parsedAmount <= 0n) {
    throw new Error("Milestone amount is required.");
  }

  return parsedAmount.toString();
}

function requireText(value: string, message: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
}

function requireWalletAddress(walletAddress: string): string {
  return requireText(walletAddress, "Requester wallet cannot be empty.").toLowerCase();
}

function parseAcceptanceDeadline(value: string): string {
  if (/^\d+$/.test(value)) {
    return value;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error("Acceptance deadline is invalid.");
  }

  return Math.floor(timestamp / 1000).toString();
}

function toRepositoryEscrowStatus(
  state: "PendingAcceptance" | "Active" | "Disputed" | "Completed" | "Cancelled"
): EscrowStatus {
  if (state === "Disputed") {
    return "DISPUTED";
  }

  if (state === "Completed") {
    return "COMPLETED";
  }

  if (state === "Cancelled") {
    return "CANCELLED";
  }

  if (state === "PendingAcceptance") {
    return "PENDING_FREELANCER";
  }

  return "ACTIVE";
}

function toEscrowResponse(escrow: EscrowRecord): EscrowResponse {
  return {
    id: escrow._id.toString(),
    blockchainEscrowId: escrow.blockchainEscrowId,
    projectId: escrow.projectId.toString(),
    proposalId: escrow.proposalId.toString(),
    clientWallet: escrow.clientWallet,
    freelancerWallet: escrow.freelancerWallet,
    tokenAddress: escrow.tokenAddress,
    totalAmount: escrow.totalAmount,
    transactionHash: escrow.transactionHash,
    status: escrow.status,
    milestones: escrow.milestones,
    attachments: escrow.attachments,
    createdAt: escrow.createdAt,
    updatedAt: escrow.updatedAt
  };
}

function isTransactionUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Transaction numbers are only allowed") ||
    error.message.includes("transactions are not supported")
  );
}
