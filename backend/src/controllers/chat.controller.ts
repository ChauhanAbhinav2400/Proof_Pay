import type { Request, Response } from "express";

import { chatService } from "../services/chat";
import { asyncHandler } from "../utils/asyncHandler";

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.sendMessage({
    ...req.body,
    ...getChatReference(req),
    senderWallet: req.user!.walletAddress
  });

  res.status(201).json(result);
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.getMessages({
    ...getChatReference(req),
    options: req.query
  });

  res.status(200).json(result);
});

export const joinRoom = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.joinRoom(req.body);

  res.status(200).json(result);
});

export const leaveRoom = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.leaveRoom(req.body);

  res.status(200).json(result);
});

function getChatReference(req: Request): { chatType: "PROPOSAL" | "ESCROW"; referenceId: string } {
  if (req.params.proposalId) {
    return {
      chatType: "PROPOSAL",
      referenceId: req.params.proposalId
    };
  }

  return {
    chatType: "ESCROW",
    referenceId: req.params.blockchainEscrowId
  };
}
