import type { Proposal } from "../../src/models/proposal/proposal.types";
import { createObjectId, randomWallet } from "../utils";

export type ProposalFactoryData = Omit<Proposal, "createdAt" | "updatedAt">;

export function buildProposal(
  overrides: Partial<ProposalFactoryData> = {}
): ProposalFactoryData {
  return {
    projectId: createObjectId(),
    freelancerWallet: randomWallet(),
    coverLetter: "I can deliver this project with clear communication and quality work.",
    proposedBudget: "900",
    estimatedDuration: "10 days",
    status: "PENDING",
    ...overrides
  };
}
