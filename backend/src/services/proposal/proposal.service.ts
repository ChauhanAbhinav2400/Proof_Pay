import { projectRepository } from "../../repositories/project";
import type { ProjectRecord } from "../../repositories/project";
import { proposalRepository } from "../../repositories/proposal";
import type {
  CreateProposalInput as CreateProposalRepositoryInput,
  ProposalRecord,
  UpdateProposalInput as UpdateProposalRepositoryInput
} from "../../repositories/proposal";
import { userRepository } from "../../repositories/user";
import { escrowService } from "../escrow";
import type {
  AcceptProposalInput,
  AcceptProposalResponse,
  CreateProposalInput,
  ProposalListOptions,
  ProposalResponse,
  UpdateProposalInput,
  WithdrawProposalInput
} from "./proposal.types";

export async function createProposal(
  input: CreateProposalInput
): Promise<ProposalResponse> {
  const project = await getExistingProject(input.projectId);
  const freelancerWallet = requireWalletAddress(
    input.freelancerWallet,
    "Freelancer wallet cannot be empty."
  );

  await ensureFreelancerExists(freelancerWallet);
  ensureProjectAcceptsProposals(project);

  const existingProposal = await proposalRepository.findByProjectAndFreelancer(
    project._id,
    freelancerWallet
  );

  if (existingProposal) {
    throw new Error("Proposal already submitted.");
  }

  const createInput: CreateProposalRepositoryInput = {
    projectId: project._id,
    freelancerWallet,
    coverLetter: requireText(
      input.coverLetter,
      "Proposal cover letter cannot be empty."
    ),
    proposedBudget: requireText(input.proposedBudget, "Budget cannot be empty."),
    estimatedDuration: requireText(
      input.estimatedDuration,
      "Estimated duration cannot be empty."
    )
  };

  const proposal = await proposalRepository.createProposal(createInput);

  return toProposalResponse(proposal);
}

export async function getProposalById(
  proposalId: string
): Promise<ProposalResponse> {
  const proposal = await getExistingProposal(proposalId);

  return toProposalResponse(proposal);
}

export async function getProjectProposals(
  projectId: string,
  options?: ProposalListOptions
): Promise<ProposalResponse[]> {
  const project = await getExistingProject(projectId);
  const proposals = await proposalRepository.findByProject(project._id, options);

  return proposals.map(toProposalResponse);
}

export async function getFreelancerProposals(
  freelancerWallet: string,
  options?: ProposalListOptions
): Promise<ProposalResponse[]> {
  const normalizedWallet = requireWalletAddress(
    freelancerWallet,
    "Freelancer wallet cannot be empty."
  );
  const proposals = await proposalRepository.findByFreelancerWallet(
    normalizedWallet,
    options
  );

  return proposals.map(toProposalResponse);
}

export async function updateProposal(
  proposalId: string,
  input: UpdateProposalInput
): Promise<ProposalResponse> {
  const proposal = await getExistingProposal(proposalId);
  const requesterWallet = requireWalletAddress(
    input.requesterWallet,
    "Requester wallet cannot be empty."
  );

  ensureProposalOwner(proposal, requesterWallet, "Only proposal owner may modify proposal.");
  ensureProposalPending(proposal, "Proposal already processed.");

  const updateInput = compactProposalUpdate(input);

  if (Object.keys(updateInput).length === 0) {
    throw new Error("Proposal update must contain at least one field.");
  }

  const updatedProposal = await proposalRepository.updateProposal(
    proposal._id,
    updateInput
  );

  if (!updatedProposal) {
    throw new Error("Proposal not found.");
  }

  return toProposalResponse(updatedProposal);
}

export async function withdrawProposal(
  proposalId: string,
  input: WithdrawProposalInput
): Promise<ProposalResponse> {
  const proposal = await getExistingProposal(proposalId);
  const requesterWallet = requireWalletAddress(
    input.requesterWallet,
    "Requester wallet cannot be empty."
  );

  ensureProposalOwner(proposal, requesterWallet, "Only proposal owner may withdraw proposal.");
  ensureProposalPending(proposal, "Proposal already processed.");

  const withdrawnProposal = await proposalRepository.withdrawProposal(proposal._id);

  if (!withdrawnProposal) {
    throw new Error("Proposal not found.");
  }

  return toProposalResponse(withdrawnProposal);
}

export async function acceptProposal(
  proposalId: string,
  input: AcceptProposalInput
): Promise<AcceptProposalResponse> {
  const proposal = await getExistingProposal(proposalId);
  const project = await getExistingProject(proposal.projectId.toString());
  const requesterWallet = requireWalletAddress(
    input.requesterWallet,
    "Requester wallet cannot be empty."
  );

  ensureProjectOwner(project, requesterWallet);
  ensureProjectAcceptsProposals(project);
  ensureProposalBelongsToProject(proposal, project);
  ensureProposalPending(proposal, "Proposal already processed.");

  const acceptedProposal = await proposalRepository.acceptProposal(proposal._id);

  if (!acceptedProposal) {
    throw new Error("Proposal not found.");
  }

  await proposalRepository.rejectRemainingProposals(project._id, acceptedProposal._id);
  const updatedProject = await projectRepository.updateStatus(
    project._id,
    "ESCROW_CREATED"
  );

  if (!updatedProject) {
    throw new Error("Project not found.");
  }

  const escrowInput: Parameters<typeof escrowService.createEscrow>[0] = {
    requesterWallet,
    projectId: project._id.toString(),
    proposalId: acceptedProposal._id.toString(),
    tokenAddress: input.tokenAddress,
    acceptanceDeadline: input.acceptanceDeadline,
    milestones: input.milestones
  };

  if (input.attachments !== undefined) {
    escrowInput.attachments = input.attachments;
  }

  const escrow = await escrowService.createEscrow(escrowInput);

  return {
    proposal: toProposalResponse(acceptedProposal),
    escrow
  };
}

export async function proposalExists(proposalId: string): Promise<boolean> {
  const normalizedProposalId = requireText(
    proposalId,
    "Proposal id is required."
  );

  return proposalRepository.exists(normalizedProposalId);
}

function compactProposalUpdate(
  input: UpdateProposalInput
): UpdateProposalRepositoryInput {
  const update: UpdateProposalRepositoryInput = {};
  const coverLetter = normalizeOptionalText(input.coverLetter);
  const proposedBudget = normalizeOptionalText(input.proposedBudget);
  const estimatedDuration = normalizeOptionalText(input.estimatedDuration);

  if (input.coverLetter !== undefined) {
    update.coverLetter = requireNormalizedText(
      coverLetter,
      "Proposal cover letter cannot be empty."
    );
  }

  if (input.proposedBudget !== undefined) {
    update.proposedBudget = requireNormalizedText(
      proposedBudget,
      "Budget cannot be empty."
    );
  }

  if (input.estimatedDuration !== undefined) {
    update.estimatedDuration = requireNormalizedText(
      estimatedDuration,
      "Estimated duration cannot be empty."
    );
  }

  return update;
}

async function ensureFreelancerExists(freelancerWallet: string): Promise<void> {
  if (!(await userRepository.existsByWallet(freelancerWallet))) {
    throw new Error("Freelancer not found.");
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

function ensureProjectAcceptsProposals(project: ProjectRecord): void {
  if (project.status !== "OPEN") {
    throw new Error("Project is no longer accepting proposals.");
  }
}

function ensureProjectOwner(
  project: ProjectRecord,
  requesterWallet: string
): void {
  if (project.clientWallet !== requesterWallet) {
    throw new Error("Only project owner may accept proposal.");
  }
}

function ensureProposalBelongsToProject(
  proposal: ProposalRecord,
  project: ProjectRecord
): void {
  if (proposal.projectId.toString() !== project._id.toString()) {
    throw new Error("Proposal does not belong to project.");
  }
}

function ensureProposalOwner(
  proposal: ProposalRecord,
  requesterWallet: string,
  message: string
): void {
  if (proposal.freelancerWallet !== requesterWallet) {
    throw new Error(message);
  }
}

function ensureProposalPending(proposal: ProposalRecord, message: string): void {
  if (proposal.status !== "PENDING") {
    throw new Error(message);
  }
}

function requireText(value: string, message: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
}

function requireWalletAddress(walletAddress: string, message: string): string {
  return requireText(walletAddress, message).toLowerCase();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? undefined : normalizedValue;
}

function requireNormalizedText(
  value: string | undefined,
  message: string
): string {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

function toProposalResponse(proposal: ProposalRecord): ProposalResponse {
  return {
    id: proposal._id.toString(),
    projectId: proposal.projectId.toString(),
    freelancerWallet: proposal.freelancerWallet,
    coverLetter: proposal.coverLetter,
    proposedBudget: proposal.proposedBudget,
    estimatedDuration: proposal.estimatedDuration,
    status: proposal.status,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt
  };
}
