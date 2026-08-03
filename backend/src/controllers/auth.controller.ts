import type { Request, Response } from "express";

import {
  requestNonce,
  verifyWalletSignature
} from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";

export const nonceController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await requestNonce(req.body);

    res.status(200).json(result);
  }
);

export const verifyController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await verifyWalletSignature(req.body);

    res.status(200).json(result);
  }
);
