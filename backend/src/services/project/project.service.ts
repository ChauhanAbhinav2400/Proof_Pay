import { projectRepository } from "../../repositories/project";
import type {
  CreateProjectInput as CreateProjectRepositoryInput,
  ProjectRecord,
  UpdateProjectInput as UpdateProjectRepositoryInput
} from "../../repositories/project";
import { userRepository } from "../../repositories/user";
import type {
  CancelProjectInput,
  CreateProjectInput,
  ProjectListOptions,
  ProjectResponse,
  UpdateProjectInput
} from "./project.types";

export async function createProject(
  input: CreateProjectInput
): Promise<ProjectResponse> {
  const clientWallet = requireWalletAddress(input.clientWallet);

  await ensureClientExists(clientWallet);

  const createInput: CreateProjectRepositoryInput = {
    clientWallet,
    title: requireText(input.title, "Project title cannot be empty."),
    description: requireText(input.description, "Description cannot be empty."),
    budget: requireText(input.budget, "Budget cannot be empty."),
    currency: requireText(input.currency, "Currency cannot be empty."),
    expectedDuration: requireText(
      input.expectedDuration,
      "Expected duration cannot be empty."
    ),
    skills: requireSkills(input.skills)
  };

  if (input.attachments !== undefined) {
    createInput.attachments = input.attachments;
  }

  const project = await projectRepository.createProject(createInput);

  return toProjectResponse(project);
}

export async function getProjectById(projectId: string): Promise<ProjectResponse> {
  const project = await getExistingProject(projectId);

  return toProjectResponse(project);
}

export async function getProjectsByClient(
  clientWallet: string,
  options?: ProjectListOptions
): Promise<ProjectResponse[]> {
  const normalizedWallet = requireWalletAddress(clientWallet);
  const projects = await projectRepository.findByClientWallet(
    normalizedWallet,
    options
  );

  return projects.map(toProjectResponse);
}

export async function getOpenProjects(
  options?: ProjectListOptions
): Promise<ProjectResponse[]> {
  const projects = await projectRepository.findOpenProjects(options);

  return projects.map(toProjectResponse);
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<ProjectResponse> {
  const project = await getExistingProject(projectId);
  const requesterWallet = requireWalletAddress(input.requesterWallet);

  ensureProjectOwner(project, requesterWallet, "Only project owner can update project.");
  ensureProjectIsOpen(project, "Project is no longer editable.");

  const updateInput = compactProjectUpdate(input);

  if (Object.keys(updateInput).length === 0) {
    throw new Error("Invalid project update.");
  }

  const updatedProject = await projectRepository.updateProject(
    project._id,
    updateInput
  );

  if (!updatedProject) {
    throw new Error("Project not found.");
  }

  return toProjectResponse(updatedProject);
}

export async function cancelProject(
  projectId: string,
  input: CancelProjectInput
): Promise<ProjectResponse> {
  const project = await getExistingProject(projectId);
  const requesterWallet = requireWalletAddress(input.requesterWallet);

  ensureProjectOwner(project, requesterWallet, "Only project owner can cancel project.");
  ensureProjectIsOpen(project, "Project is no longer cancellable.");

  const cancelledProject = await projectRepository.cancelProject(project._id);

  if (!cancelledProject) {
    throw new Error("Project not found.");
  }

  return toProjectResponse(cancelledProject);
}

export async function projectExists(projectId: string): Promise<boolean> {
  const normalizedProjectId = requireText(projectId, "Project id is required.");

  return projectRepository.exists(normalizedProjectId);
}

function compactProjectUpdate(
  input: UpdateProjectInput
): UpdateProjectRepositoryInput {
  const update: UpdateProjectRepositoryInput = {};
  const title = normalizeOptionalText(input.title);
  const description = normalizeOptionalText(input.description);
  const budget = normalizeOptionalText(input.budget);
  const currency = normalizeOptionalText(input.currency);
  const expectedDuration = normalizeOptionalText(input.expectedDuration);

  if (input.title !== undefined) {
    update.title = requireNormalizedText(title, "Project title cannot be empty.");
  }

  if (input.description !== undefined) {
    update.description = requireNormalizedText(
      description,
      "Description cannot be empty."
    );
  }

  if (input.budget !== undefined) {
    update.budget = requireNormalizedText(budget, "Budget cannot be empty.");
  }

  if (input.currency !== undefined) {
    update.currency = requireNormalizedText(currency, "Currency cannot be empty.");
  }

  if (input.expectedDuration !== undefined) {
    update.expectedDuration = requireNormalizedText(
      expectedDuration,
      "Expected duration cannot be empty."
    );
  }

  if (input.skills !== undefined) {
    update.skills = requireSkills(input.skills);
  }

  if (input.attachments !== undefined) {
    update.attachments = input.attachments;
  }

  return update;
}

async function ensureClientExists(clientWallet: string): Promise<void> {
  if (!(await userRepository.existsByWallet(clientWallet))) {
    throw new Error("Client not found.");
  }
}

async function getExistingProject(projectId: string): Promise<ProjectRecord> {
  const normalizedProjectId = requireText(projectId, "Project id is required.");
  const project = await projectRepository.findById(normalizedProjectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  return project;
}

function ensureProjectOwner(
  project: ProjectRecord,
  requesterWallet: string,
  message: string
): void {
  if (project.clientWallet !== requesterWallet) {
    throw new Error(message);
  }
}

function ensureProjectIsOpen(project: ProjectRecord, message: string): void {
  if (project.status !== "OPEN") {
    throw new Error(message);
  }
}

function requireSkills(skills: string[]): string[] {
  const normalizedSkills = skills
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);

  if (normalizedSkills.length === 0) {
    throw new Error("Skills array cannot be empty.");
  }

  return normalizedSkills;
}

function requireText(value: string, message: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
}

function requireWalletAddress(walletAddress: string): string {
  return requireText(walletAddress, "Client wallet cannot be empty.").toLowerCase();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? undefined : normalizedValue;
}

function requireNormalizedText(
  value: string | undefined,
  message: string
): string {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

function toProjectResponse(project: ProjectRecord): ProjectResponse {
  return {
    id: project._id.toString(),
    clientWallet: project.clientWallet,
    title: project.title,
    description: project.description,
    budget: project.budget,
    currency: project.currency,
    expectedDuration: project.expectedDuration,
    skills: project.skills,
    attachments: project.attachments,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}
