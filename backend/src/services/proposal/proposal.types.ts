import type {
  ProposalListOptions as ProposalRepositoryListOptions,
  ProposalRecord
} from "../../repositories/proposal";
import type {
  BlockchainOperationResponse,
  CreateEscrowMilestoneInput,
  EscrowAttachment
} from "../escrow";

export type ProposalStatus = ProposalRecord["status"];

export interface ProposalResponse {
  id: string;
  projectId: string;
  freelancerWallet: string;
  coverLetter: string;
  proposedBudget: string;
  estimatedDuration: string;
  status: ProposalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProposalInput {
  projectId: string;
  freelancerWallet: string;
  coverLetter: string;
  proposedBudget: string;
  estimatedDuration: string;
}

export interface UpdateProposalInput {
  requesterWallet: string;
  coverLetter?: string;
  proposedBudget?: string;
  estimatedDuration?: string;
}

export interface WithdrawProposalInput {
  requesterWallet: string;
}

export interface AcceptProposalInput {
  requesterWallet: string;
  tokenAddress: string;
  acceptanceDeadline: string;
  milestones: CreateEscrowMilestoneInput[];
  attachments?: EscrowAttachment[];
  blockchainEscrowId?: string;
  transactionHash?: string;
}

export interface AcceptProposalResponse {
  proposal: ProposalResponse;
  escrow: BlockchainOperationResponse;
}

export interface ProposalListOptions extends ProposalRepositoryListOptions {}
