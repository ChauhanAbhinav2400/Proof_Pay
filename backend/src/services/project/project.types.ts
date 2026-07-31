import type {
  ProjectListOptions as ProjectRepositoryListOptions,
  ProjectRecord
} from "../../repositories/project";

export type ProjectAttachment = ProjectRecord["attachments"][number];
export type ProjectStatus = ProjectRecord["status"];

export interface ProjectResponse {
  id: string;
  clientWallet: string;
  title: string;
  description: string;
  budget: string;
  currency: string;
  expectedDuration: string;
  skills: string[];
  attachments: ProjectAttachment[];
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  clientWallet: string;
  title: string;
  description: string;
  budget: string;
  currency: string;
  expectedDuration: string;
  skills: string[];
  attachments?: ProjectAttachment[];
}

export interface UpdateProjectInput {
  requesterWallet: string;
  title?: string;
  description?: string;
  budget?: string;
  currency?: string;
  expectedDuration?: string;
  skills?: string[];
  attachments?: ProjectAttachment[];
}

export interface CancelProjectInput {
  requesterWallet: string;
}

export interface ProjectListOptions extends ProjectRepositoryListOptions {}
