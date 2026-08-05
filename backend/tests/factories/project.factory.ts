import type { Project } from "../../src/models/project/project.types";
import { randomWallet } from "../utils";

export type ProjectFactoryData = Omit<Project, "createdAt" | "updatedAt">;

export function buildProject(
  overrides: Partial<ProjectFactoryData> = {}
): ProjectFactoryData {
  return {
    clientWallet: randomWallet(),
    title: "Build ProofPay test feature",
    description: "A valid project description used only by automated tests.",
    budget: "1000",
    currency: "USDT",
    expectedDuration: "2 weeks",
    skills: ["Solidity", "TypeScript"],
    attachments: [],
    status: "OPEN",
    ...overrides
  };
}
