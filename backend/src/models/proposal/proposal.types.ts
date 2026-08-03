import type { Types } from "mongoose";

export const PROPOSAL_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "CLOSED",
  "REJECTED",
  "WITHDRAWN"
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface Proposal {
  projectId: Types.ObjectId;
  freelancerWallet: string;
  coverLetter: string;
  proposedBudget: string;
  estimatedDuration: string;
  status: ProposalStatus;
  createdAt: Date;
  updatedAt: Date;
}
