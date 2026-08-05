import type { Escrow } from "../../src/models/escrow/escrow.types";
import { createObjectId, randomTransactionHash, randomWallet } from "../utils";

export type EscrowFactoryData = Omit<Escrow, "createdAt" | "updatedAt">;

export function buildEscrow(
  overrides: Partial<EscrowFactoryData> = {}
): EscrowFactoryData {
  return {
    blockchainEscrowId: "1",
    projectId: createObjectId(),
    proposalId: createObjectId(),
    clientWallet: randomWallet(),
    freelancerWallet: randomWallet(),
    tokenAddress: randomWallet(),
    totalAmount: "1000",
    transactionHash: randomTransactionHash(),
    status: "ACTIVE",
    milestones: [
      {
        title: "Initial milestone",
        description: "Deliver the agreed initial work.",
        amount: "1000",
        status: "PENDING",
        submissionFiles: []
      }
    ],
    attachments: [],
    ...overrides
  };
}
