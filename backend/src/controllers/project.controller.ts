import type { Request, Response } from "express";

import { projectService } from "../services/project";
import { asyncHandler } from "../utils/asyncHandler";

export const createProject = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await projectService.createProject({
      ...req.body,
      clientWallet: req.user!.walletAddress
    });

    res.status(201).json(result);
  }
);

export const getProjectById = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await projectService.getProjectById(req.params.projectId);

    res.status(200).json(result);
  }
);

export const getProjectsByClient = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await projectService.getProjectsByClient(
      req.params.clientWallet,
      req.query
    );

    res.status(200).json(result);
  }
);

export const getOpenProjects = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await projectService.getOpenProjects(req.query);

    res.status(200).json(result);
  }
);

export const updateProject = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await projectService.updateProject(req.params.projectId, {
      ...req.body,
      requesterWallet: req.user!.walletAddress
    });

    res.status(200).json(result);
  }
);

export const cancelProject = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await projectService.cancelProject(req.params.projectId, {
      requesterWallet: req.user!.walletAddress
    });

    res.status(200).json(result);
  }
);

export const projectExists = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await projectService.projectExists(req.params.projectId);

    res.status(200).json(result);
  }
);
