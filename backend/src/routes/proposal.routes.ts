import { Router } from "express";

import {
  acceptProposal,
  getFreelancerProposals,
  getProposalById,
  proposalExists,
  updateProposal,
  withdrawProposal
} from "../controllers/proposal.controller";
import { authenticate } from "../middleware/authenticate";

export const proposalRouter = Router();

proposalRouter.use(authenticate);

proposalRouter.get("/freelancers/:freelancerWallet", getFreelancerProposals);
proposalRouter.get("/:proposalId/exists", proposalExists);
proposalRouter.get("/:proposalId", getProposalById);
proposalRouter.patch("/:proposalId", updateProposal);
proposalRouter.post("/:proposalId/withdraw", withdrawProposal);
proposalRouter.post("/:proposalId/accept", acceptProposal);
