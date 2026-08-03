import type { Types } from "mongoose";

export const ESCROW_STATUSES = [
  "PENDING_FREELANCER",
  "ACTIVE",
  "DISPUTED",
  "COMPLETED",
  "CANCELLED"
] as const;

export const MILESTONE_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "APPROVED",
  "RELEASED",
  "DISPUTED"
] as const;

export type EscrowStatus = (typeof ESCROW_STATUSES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export interface EscrowAttachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface Milestone {
  title: string;
  description: string;
  amount: string;
  status: MilestoneStatus;
  submissionFiles: EscrowAttachment[];
  submittedAt?: Date;
  approvedAt?: Date;
  releasedAt?: Date;
}

export interface Escrow {
  blockchainEscrowId: string;
  projectId: Types.ObjectId;
  proposalId: Types.ObjectId;
  clientWallet: string;
  freelancerWallet: string;
  tokenAddress: string;
  totalAmount: string;
  transactionHash?: string;
  status: EscrowStatus;
  milestones: Milestone[];
  attachments: EscrowAttachment[];
  createdAt: Date;
  updatedAt: Date;
}
