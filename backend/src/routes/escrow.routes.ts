import { Router } from "express";

import {
  approveMilestone,
  acceptEscrow,
  cancelEscrow,
  createEscrow,
  escrowExists,
  getDisputedEscrows,
  getEscrowByBlockchainId,
  getFreelancerEscrows,
  raiseDispute,
  releaseMilestone,
  resolveDispute,
  submitMilestone,
} from "../controllers/escrow.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

export const escrowRouter = Router();

escrowRouter.use(authenticate);

escrowRouter.post("/", createEscrow);
escrowRouter.get("/", getFreelancerEscrows);
escrowRouter.get("/disputes", authorize("ARBITRATOR"), getDisputedEscrows);
escrowRouter.get("/:blockchainEscrowId/exists", escrowExists);
escrowRouter.get("/:blockchainEscrowId", getEscrowByBlockchainId);
escrowRouter.post("/:blockchainEscrowId/accept", acceptEscrow);
escrowRouter.post(
  "/:blockchainEscrowId/milestones/:milestoneIndex/submit",
  submitMilestone,
);
escrowRouter.post(
  "/:blockchainEscrowId/milestones/:milestoneIndex/approve",
  approveMilestone,
);
escrowRouter.post(
  "/:blockchainEscrowId/milestones/:milestoneIndex/release",
  releaseMilestone,
);
escrowRouter.post("/:blockchainEscrowId/dispute", raiseDispute);
escrowRouter.post("/:blockchainEscrowId/resolve", resolveDispute);
escrowRouter.post("/:blockchainEscrowId/cancel", cancelEscrow);
