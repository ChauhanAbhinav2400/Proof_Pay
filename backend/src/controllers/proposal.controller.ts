import type { Request, Response } from "express";

import { proposalService } from "../services/proposal";
import { asyncHandler } from "../utils/asyncHandler";

export const createProposal = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.createProposal({
      ...req.body,
      projectId: req.params.projectId,
      freelancerWallet: req.user!.walletAddress
    });

    res.status(201).json(result);
  }
);

export const getProposalById = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.getProposalById(req.params.proposalId);

    res.status(200).json(result);
  }
);

export const getProjectProposals = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.getProjectProposals(
      req.params.projectId,
      req.query
    );

    res.status(200).json(result);
  }
);

export const getFreelancerProposals = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.getFreelancerProposals(
      req.params.freelancerWallet,
      req.query
    );

    res.status(200).json(result);
  }
);

export const updateProposal = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.updateProposal(req.params.proposalId, {
      ...req.body,
      requesterWallet: req.user!.walletAddress
    });

    res.status(200).json(result);
  }
);

export const withdrawProposal = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.withdrawProposal(req.params.proposalId, {
      requesterWallet: req.user!.walletAddress
    });

    res.status(200).json(result);
  }
);

export const acceptProposal = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.acceptProposal(req.params.proposalId, {
      ...req.body,
      requesterWallet: req.user!.walletAddress
    });

    res.status(200).json(result);
  }
);

export const proposalExists = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await proposalService.proposalExists(req.params.proposalId);

    res.status(200).json(result);
  }
);
