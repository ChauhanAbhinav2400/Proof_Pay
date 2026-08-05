import type { ClientSession, Types } from "mongoose";

import type {
  Proposal,
  ProposalStatus
} from "../../models/proposal/proposal.types";

export interface ProposalRecord extends Proposal {
  _id: Types.ObjectId;
}

export interface CreateProposalInput {
  projectId: Types.ObjectId;
  freelancerWallet: string;
  coverLetter: string;
  proposedBudget: string;
  estimatedDuration: string;
  status?: ProposalStatus;
}

export interface UpdateProposalInput {
  coverLetter?: string;
  proposedBudget?: string;
  estimatedDuration?: string;
}

export interface ProposalListOptions {
  limit?: number;
  skip?: number;
  sort?: ProposalSortOptions;
}

export interface ProposalWriteOptions {
  session?: ClientSession;
}

export type ProposalSortOptions = Partial<
  Record<"createdAt" | "updatedAt" | "proposedBudget", 1 | -1 | "asc" | "desc">
>;
