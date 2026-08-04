import { Router } from "express";

import {
  cancelProject,
  createProject,
  getOpenProjects,
  getProjectById,
  getProjectsByClient,
  projectExists,
  updateProject
} from "../controllers/project.controller";
import {
  createProposal,
  getProjectProposals
} from "../controllers/proposal.controller";
import { authenticate } from "../middleware/authenticate";

export const projectRouter = Router();

projectRouter.post("/", authenticate, createProject);
projectRouter.get("/", getOpenProjects);
projectRouter.get("/clients/:clientWallet", getProjectsByClient);
projectRouter.post(
  "/:projectId/proposals",
  authenticate,
  createProposal
);
projectRouter.get(
  "/:projectId/proposals",
  authenticate,
  getProjectProposals
);
projectRouter.get("/:projectId/exists", projectExists);
projectRouter.get("/:projectId", getProjectById);
projectRouter.patch("/:projectId", authenticate, updateProject);
projectRouter.post("/:projectId/cancel", authenticate, cancelProject);
