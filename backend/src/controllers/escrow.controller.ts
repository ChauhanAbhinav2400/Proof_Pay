import type { Request, Response } from "express";

import { escrowService } from "../services/escrow";
import { asyncHandler } from "../utils/asyncHandler";

export const createEscrow = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.createEscrow({
      ...req.body,
      requesterWallet: req.user!.walletAddress
    });

    res.status(201).json(result);
  }
);

export const getEscrowById = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.getEscrowById({
      escrowId: req.params.escrowId
    });

    res.status(200).json(result);
  }
);

export const getEscrowByBlockchainId = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.getEscrowByBlockchainId({
      blockchainEscrowId: req.params.blockchainEscrowId
    });

    res.status(200).json(result);
  }
);

export const getProjectEscrow = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.getProjectEscrow({
      projectId: req.params.projectId
    });

    res.status(200).json(result);
  }
);

export const getFreelancerEscrows = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.getFreelancerEscrows({
      freelancerWallet: req.user!.walletAddress,
      options: req.query
    });

    res.status(200).json(result);
  }
);

export const getDisputedEscrows = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.getDisputedEscrows({
      options: req.query
    });

    res.status(200).json(result);
  }
);

export const acceptEscrow = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.acceptEscrow({
      ...req.body,
      requesterWallet: req.user!.walletAddress,
      blockchainEscrowId: req.params.blockchainEscrowId
    });

    res.status(200).json(result);
  }
);

export const approveMilestone = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.approveMilestone({
      ...req.body,
      requesterWallet: req.user!.walletAddress,
      blockchainEscrowId: req.params.blockchainEscrowId,
      milestoneIndex: Number(req.params.milestoneIndex)
    });

    res.status(200).json(result);
  }
);

export const submitMilestone = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.submitMilestone({
      requesterWallet: req.user!.walletAddress,
      blockchainEscrowId: req.params.blockchainEscrowId,
      milestoneIndex: Number(req.params.milestoneIndex)
    });

    res.status(200).json(result);
  }
);

export const releaseMilestone = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.releaseMilestone({
      ...req.body,
      requesterWallet: req.user!.walletAddress,
      blockchainEscrowId: req.params.blockchainEscrowId,
      milestoneIndex: Number(req.params.milestoneIndex)
    });

    res.status(200).json(result);
  }
);

export const raiseDispute = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.raiseDispute({
      ...req.body,
      requesterWallet: req.user!.walletAddress,
      blockchainEscrowId: req.params.blockchainEscrowId
    });

    res.status(200).json(result);
  }
);

export const resolveDispute = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.resolveDispute({
      ...req.body,
      blockchainEscrowId: req.params.blockchainEscrowId
    });

    res.status(200).json(result);
  }
);

export const cancelEscrow = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.cancelEscrow({
      requesterWallet: req.user!.walletAddress,
      blockchainEscrowId: req.params.blockchainEscrowId
    });

    res.status(200).json(result);
  }
);

export const escrowExists = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await escrowService.escrowExists(
      req.params.blockchainEscrowId
    );

    res.status(200).json(result);
  }
);
