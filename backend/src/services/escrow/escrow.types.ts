import type {
  CreateEscrowInput as CreateEscrowRepositoryInput,
  EscrowListOptions as EscrowRepositoryListOptions,
  EscrowWriteOptions,
  EscrowRecord
} from "../../repositories/escrow";

export type EscrowAttachment = EscrowRecord["attachments"][number];
export type EscrowMilestone = EscrowRecord["milestones"][number];
export type EscrowStatus = EscrowRecord["status"];

export interface EscrowResponse {
  id: string;
  blockchainEscrowId: string;
  projectId: string;
  proposalId: string;
  clientWallet: string;
  freelancerWallet: string;
  tokenAddress: string;
  totalAmount: string;
  transactionHash?: string;
  status: EscrowStatus;
  milestones: EscrowMilestone[];
  attachments: EscrowAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BlockchainOperationResponse {
  escrow: EscrowResponse;
  transactionHash: string;
}

export interface CreateEscrowInput {
  requesterWallet: string;
  projectId: string;
  proposalId: string;
  tokenAddress: string;
  acceptanceDeadline: string;
  milestones: CreateEscrowMilestoneInput[];
  attachments?: EscrowAttachment[];
}

export interface CreateEscrowMilestoneInput {
  title: string;
  description: string;
  amount: string;
}

export interface GetEscrowByIdInput {
  escrowId: string;
}

export interface GetEscrowByBlockchainIdInput {
  blockchainEscrowId: string;
}

export interface GetProjectEscrowInput {
  projectId: string;
}

export interface GetFreelancerEscrowsInput {
  freelancerWallet: string;
  options?: EscrowRepositoryListOptions;
}

export interface GetDisputedEscrowsInput {
  options?: EscrowRepositoryListOptions;
}

export interface ApproveMilestoneInput {
  requesterWallet: string;
  blockchainEscrowId: string;
  milestoneIndex: number;
  deadline: string;
  signature: string;
}

export interface SubmitMilestoneInput {
  requesterWallet: string;
  blockchainEscrowId: string;
  milestoneIndex: number;
}

export interface AcceptEscrowInput {
  requesterWallet: string;
  blockchainEscrowId: string;
  deadline: string;
  signature: string;
}

export interface ReleaseMilestoneInput extends ApproveMilestoneInput {}

export interface RaiseDisputeInput {
  requesterWallet: string;
  blockchainEscrowId: string;
  transactionHash?: string;
}

export interface ResolveDisputeInput {
  blockchainEscrowId: string;
  arbitrator: string;
  freelancerAward: string;
  clientRefund: string;
  deadline: string;
  signature: string;
}

export interface CancelEscrowInput {
  requesterWallet: string;
  blockchainEscrowId: string;
}

export interface ConfirmedEscrowCreation {
  createInput: CreateEscrowRepositoryInput;
  transactionHash: string;
}

export interface PersistConfirmedEscrowOptions extends EscrowWriteOptions {}

export interface ExistingEscrowConfirmationInput {
  blockchainEscrowId: string;
  transactionHash: string;
}
