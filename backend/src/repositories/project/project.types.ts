import type { Types } from "mongoose";

import type {
  Project,
  ProjectAttachment,
  ProjectStatus
} from "../../models/project/project.types";

export interface ProjectRecord extends Project {
  _id: Types.ObjectId;
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
  status?: ProjectStatus;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  budget?: string;
  currency?: string;
  expectedDuration?: string;
  skills?: string[];
  attachments?: ProjectAttachment[];
}

export interface ProjectListOptions {
  limit?: number;
  skip?: number;
  sort?: ProjectSortOptions;
}

export type ProjectSortOptions = Partial<
  Record<"createdAt" | "updatedAt" | "title", 1 | -1 | "asc" | "desc">
>;
