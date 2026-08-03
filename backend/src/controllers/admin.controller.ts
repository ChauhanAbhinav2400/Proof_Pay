import type { Request, Response } from "express";

import { adminService } from "../services/admin";
import { asyncHandler } from "../utils/asyncHandler";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.getSummary();

  res.status(200).json(result);
});
