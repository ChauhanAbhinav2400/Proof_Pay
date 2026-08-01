import type { BigNumberish, TransactionReceipt } from "ethers";

export type EscrowState =
  | "PendingAcceptance"
  | "Active"
  | "Disputed"
  | "Completed"
  | "Cancelled";

export interface CreateEscrowInput {
  freelancer: string;
  paymentToken: string;
  milestoneAmounts: BigNumberish[];
  acceptanceDeadline: BigNumberish;
}

export interface AcceptEscrowInput {
  escrowId: BigNumberish;
  deadline: BigNumberish;
  signature: string;
}

export interface ApproveMilestoneInput {
  escrowId: BigNumberish;
  deadline: BigNumberish;
  signature: string;
}

export interface CancelEscrowInput {
  escrowId: BigNumberish;
}

export interface RaiseDisputeInput {
  escrowId: BigNumberish;
}

export interface ResolveDisputeInput {
  escrowId: BigNumberish;
  arbitrator: string;
  freelancerAward: BigNumberish;
  clientRefund: BigNumberish;
  deadline: BigNumberish;
  signature: string;
}

export interface GetEscrowInput {
  escrowId: BigNumberish;
}

export interface GetEscrowStatusInput {
  escrowId: BigNumberish;
}

export interface GetNonceInput {
  account: string;
}

export interface EscrowChainRecord {
  escrowId: string;
  client: string;
  freelancer: string;
  paymentToken: string;
  totalAmount: string;
  acceptanceDeadline: string;
  currentMilestone: number;
  state: EscrowState;
  stateCode: number;
}

export interface TransactionResult {
  transactionHash: string;
  blockNumber: number;
  status: number | null;
  gasUsed: string;
}

export interface CreateEscrowResult extends TransactionResult {
  escrowId?: string;
}

export interface BlockchainWriteResult extends TransactionResult {}

export interface WaitForTransactionInput {
  transactionHash: string;
}

export interface WaitForTransactionResult {
  receipt: TransactionReceipt;
  transaction: TransactionResult;
}
