import type { Request, Response } from "express";

import { userService } from "../services/user";
import { asyncHandler } from "../utils/asyncHandler";

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.createUser(req.body);

  res.status(201).json(result);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.getUserById(req.params.userId);

  res.status(200).json(result);
});

export const getUserByWallet = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await userService.getUserByWallet(req.params.walletAddress);

    res.status(200).json(result);
  }
);

export const updateUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await userService.updateUserProfile(
      req.params.userId,
      req.body
    );

    res.status(200).json(result);
  }
);

export const updateUserPermissions = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await userService.updateUserPermissions(
      req.params.userId,
      req.body
    );

    res.status(200).json(result);
  }
);

export const userExists = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.userExists(req.params.walletAddress);

  res.status(200).json(result);
});
