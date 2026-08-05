import type { Types } from "mongoose";
import type { ClientSession } from "mongoose";

import type {
  Escrow,
  EscrowAttachment,
  EscrowStatus,
  Milestone
} from "../../models/escrow/escrow.types";

export interface EscrowRecord extends Escrow {
  _id: Types.ObjectId;
}

export interface CreateEscrowInput {
  blockchainEscrowId: string;
  projectId: Types.ObjectId;
  proposalId: Types.ObjectId;
  clientWallet: string;
  freelancerWallet: string;
  tokenAddress: string;
  totalAmount: string;
  transactionHash?: string;
  status?: EscrowStatus;
  milestones: Milestone[];
  attachments?: EscrowAttachment[];
}

export interface UpdateEscrowInput {
  tokenAddress?: string;
  totalAmount?: string;
  transactionHash?: string;
  status?: EscrowStatus;
  milestones?: Milestone[];
  attachments?: EscrowAttachment[];
}

export interface EscrowListOptions {
  limit?: number;
  skip?: number;
  sort?: EscrowSortOptions;
}

export interface EscrowWriteOptions {
  session?: ClientSession;
}

export type EscrowSortOptions = Partial<
  Record<"createdAt" | "updatedAt" | "totalAmount", 1 | -1 | "asc" | "desc">
>;
