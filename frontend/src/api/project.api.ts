import { apiClient } from "./client";
import type { PaginationOptions } from "../types/api";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../types/domain";

export function getOpenProjects(params?: PaginationOptions): Promise<Project[]> {
  return apiClient.get<Project[]>("/projects", { params }).then(({ data }) => data);
}

export function getProject(projectId: string): Promise<Project> {
  return apiClient.get<Project>(`/projects/${projectId}`).then(({ data }) => data);
}

export function getProjectsByClient(clientWallet: string, params?: PaginationOptions): Promise<Project[]> {
  return apiClient.get<Project[]>(`/projects/clients/${clientWallet}`, { params }).then(({ data }) => data);
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return apiClient.post<Project>("/projects", input).then(({ data }) => data);
}

export function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  return apiClient.patch<Project>(`/projects/${projectId}`, input).then(({ data }) => data);
}

export function cancelProject(projectId: string): Promise<Project> {
  return apiClient.post<Project>(`/projects/${projectId}/cancel`).then(({ data }) => data);
}

export function projectExists(projectId: string): Promise<boolean> {
  return apiClient.get<boolean>(`/projects/${projectId}/exists`).then(({ data }) => data);
}
