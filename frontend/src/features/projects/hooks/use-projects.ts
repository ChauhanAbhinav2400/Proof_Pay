import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { projectService } from "../../../services/project.service";
import type { PaginationOptions } from "../../../types/api";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../../../types/domain";
import { getApiErrorMessage } from "../../../utils/api-error";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  open: (params?: PaginationOptions) => [...projectKeys.lists(), "open", params ?? {}] as const,
  client: (wallet: string | undefined, params?: PaginationOptions) =>
    [...projectKeys.lists(), "client", wallet ?? "", params ?? {}] as const,
  detail: (projectId: string | undefined) => [...projectKeys.all, "detail", projectId ?? ""] as const
};

export function useProjects(params?: PaginationOptions) {
  return useQuery({
    queryKey: projectKeys.open(params),
    queryFn: () => projectService.getOpenProjects(params),
    retry: 1
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectService.getProject(projectId!),
    enabled: Boolean(projectId),
    retry: 1
  });
}

export function useProjectExists(projectId: string | undefined) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), "exists"] as const,
    queryFn: () => projectService.projectExists(projectId!),
    enabled: Boolean(projectId),
    retry: 1
  });
}

export function useClientProjects(walletAddress: string | undefined, params?: PaginationOptions) {
  return useQuery({
    queryKey: projectKeys.client(walletAddress, params),
    queryFn: () => projectService.getProjectsByClient(walletAddress!, params),
    enabled: Boolean(walletAddress),
    retry: 1
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.createProject(input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success("Project created.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to create project."))
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: UpdateProjectInput }) =>
      projectService.updateProject(projectId, input),
    onMutate: async ({ projectId, input }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });
      const previousProject = queryClient.getQueryData<Project>(projectKeys.detail(projectId));
      if (previousProject) queryClient.setQueryData(projectKeys.detail(projectId), { ...previousProject, ...input });
      return { previousProject, projectId };
    },
    onError: (error, _variables, context) => {
      if (context?.previousProject) queryClient.setQueryData(projectKeys.detail(context.projectId), context.previousProject);
      toast.error(getApiErrorMessage(error, "Unable to update project."));
    },
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success("Project updated.");
    }
  });
}

export function useCancelProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectService.cancelProject(projectId),
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });
      const previousProject = queryClient.getQueryData<Project>(projectKeys.detail(projectId));
      if (previousProject) queryClient.setQueryData(projectKeys.detail(projectId), { ...previousProject, status: "CANCELLED" });
      return { previousProject, projectId };
    },
    onError: (error, _projectId, context) => {
      if (context?.previousProject) queryClient.setQueryData(projectKeys.detail(context.projectId), context.previousProject);
      toast.error(getApiErrorMessage(error, "Unable to cancel project."));
    },
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success("Project cancelled.");
    }
  });
}
