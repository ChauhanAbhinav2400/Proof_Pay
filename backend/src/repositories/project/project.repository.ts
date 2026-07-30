import type { ProjectionType, QueryOptions, Types } from "mongoose";

import { ProjectModel } from "../../models/project/project.model";
import type { ProjectStatus } from "../../models/project/project.types";
import type {
  CreateProjectInput,
  ProjectListOptions,
  ProjectRecord,
  UpdateProjectInput
} from "./project.types";

const PROJECT_PROJECTION: ProjectionType<ProjectRecord> = {
  clientWallet: 1,
  title: 1,
  description: 1,
  budget: 1,
  currency: 1,
  expectedDuration: 1,
  skills: 1,
  attachments: 1,
  status: 1,
  createdAt: 1,
  updatedAt: 1
};

const RETURN_UPDATED_DOCUMENT: QueryOptions = {
  new: true,
  runValidators: true
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function createProject(
  input: CreateProjectInput
): Promise<ProjectRecord> {
  try {
    const project = await ProjectModel.create(input);

    return project.toObject();
  } catch (error) {
    throwDatabaseError("Database write failed while creating project.", error);
  }
}

export async function findById(
  projectId: string | Types.ObjectId
): Promise<ProjectRecord | null> {
  try {
    return await ProjectModel.findById(projectId, PROJECT_PROJECTION)
      .lean<ProjectRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database read failed while finding project by id.", error);
  }
}

export async function findByClientWallet(
  clientWallet: string,
  options?: ProjectListOptions
): Promise<ProjectRecord[]> {
  const pagination = getPagination(options);

  try {
    return await ProjectModel.find({ clientWallet }, PROJECT_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<ProjectRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding projects by client wallet.",
      error
    );
  }
}

export async function findOpenProjects(
  options?: ProjectListOptions
): Promise<ProjectRecord[]> {
  return findByStatus("OPEN", options);
}

export async function findByStatus(
  status: ProjectStatus,
  options?: ProjectListOptions
): Promise<ProjectRecord[]> {
  const pagination = getPagination(options);

  try {
    return await ProjectModel.find({ status }, PROJECT_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<ProjectRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding projects by status.",
      error
    );
  }
}

export async function updateProject(
  projectId: string | Types.ObjectId,
  input: UpdateProjectInput
): Promise<ProjectRecord | null> {
  try {
    return await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: input },
      RETURN_UPDATED_DOCUMENT
    )
      .select(PROJECT_PROJECTION)
      .lean<ProjectRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database write failed while updating project.", error);
  }
}

export async function updateStatus(
  projectId: string | Types.ObjectId,
  status: ProjectStatus
): Promise<ProjectRecord | null> {
  try {
    return await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: { status } },
      RETURN_UPDATED_DOCUMENT
    )
      .select(PROJECT_PROJECTION)
      .lean<ProjectRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database write failed while updating project status.",
      error
    );
  }
}

export async function cancelProject(
  projectId: string | Types.ObjectId
): Promise<ProjectRecord | null> {
  return updateStatus(projectId, "CANCELLED");
}

export async function exists(projectId: string | Types.ObjectId): Promise<boolean> {
  try {
    const existingProject = await ProjectModel.exists({ _id: projectId }).exec();

    return existingProject !== null;
  } catch (error) {
    throwDatabaseError(
      "Database read failed while checking project existence.",
      error
    );
  }
}

function getPagination(options?: ProjectListOptions): {
  limit: number;
  skip: number;
} {
  return {
    limit: Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT),
    skip: Math.max(options?.skip ?? 0, 0)
  };
}

function throwDatabaseError(message: string, cause: unknown): never {
  throw new Error(message, { cause });
}
