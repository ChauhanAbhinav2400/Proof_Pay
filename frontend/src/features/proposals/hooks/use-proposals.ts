import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { proposalService } from "../../../services/proposal.service";
import type { PaginationOptions } from "../../../types/api";
import type { AcceptProposalInput, CreateProposalInput, Proposal, UpdateProposalInput } from "../../../types/domain";
import { getApiErrorMessage } from "../../../utils/api-error";
import { projectKeys } from "../../projects/hooks/use-projects";

export const proposalKeys = {
  all: ["proposals"] as const,
  lists: () => [...proposalKeys.all, "list"] as const,
  project: (projectId: string | undefined, params?: PaginationOptions) =>
    [...proposalKeys.lists(), "project", projectId ?? "", params ?? {}] as const,
  freelancer: (wallet: string | undefined, params?: PaginationOptions) =>
    [...proposalKeys.lists(), "freelancer", wallet ?? "", params ?? {}] as const,
  detail: (proposalId: string | undefined) => [...proposalKeys.all, "detail", proposalId ?? ""] as const
};

export function useProjectProposals(projectId: string | undefined, params?: PaginationOptions) {
  return useQuery({
    queryKey: proposalKeys.project(projectId, params),
    queryFn: () => proposalService.getProjectProposals(projectId!, params),
    enabled: Boolean(projectId),
    retry: 1
  });
}

export function useProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: proposalKeys.detail(proposalId),
    queryFn: () => proposalService.getProposal(proposalId!),
    enabled: Boolean(proposalId),
    retry: 1
  });
}

export function useProposalExists(proposalId: string | undefined) {
  return useQuery({
    queryKey: [...proposalKeys.detail(proposalId), "exists"] as const,
    queryFn: () => proposalService.proposalExists(proposalId!),
    enabled: Boolean(proposalId),
    retry: 1
  });
}

export function useFreelancerProposals(walletAddress: string | undefined, params?: PaginationOptions) {
  return useQuery({
    queryKey: proposalKeys.freelancer(walletAddress, params),
    queryFn: () => proposalService.getFreelancerProposals(walletAddress!, params),
    enabled: Boolean(walletAddress),
    retry: 1
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateProposalInput }) =>
      proposalService.createProposal(projectId, input),
    onSuccess: (proposal) => {
      queryClient.setQueryData(proposalKeys.detail(proposal.id), proposal);
      void queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
      toast.success("Proposal submitted.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to submit proposal."))
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, input }: { proposalId: string; input: UpdateProposalInput }) =>
      proposalService.updateProposal(proposalId, input),
    onMutate: async ({ proposalId, input }) => {
      await queryClient.cancelQueries({ queryKey: proposalKeys.detail(proposalId) });
      const previousProposal = queryClient.getQueryData<Proposal>(proposalKeys.detail(proposalId));
      if (previousProposal) queryClient.setQueryData(proposalKeys.detail(proposalId), { ...previousProposal, ...input });
      return { previousProposal, proposalId };
    },
    onError: (error, _variables, context) => {
      if (context?.previousProposal) queryClient.setQueryData(proposalKeys.detail(context.proposalId), context.previousProposal);
      toast.error(getApiErrorMessage(error, "Unable to update proposal."));
    },
    onSuccess: (proposal) => {
      queryClient.setQueryData(proposalKeys.detail(proposal.id), proposal);
      void queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
      toast.success("Proposal updated.");
    }
  });
}

export function useWithdrawProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => proposalService.withdrawProposal(proposalId),
    onSuccess: (proposal) => {
      queryClient.setQueryData(proposalKeys.detail(proposal.id), proposal);
      void queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
      toast.success("Proposal withdrawn.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to withdraw proposal."))
  });
}

export function useAcceptProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, input }: { proposalId: string; input: AcceptProposalInput }) =>
      proposalService.acceptProposal(proposalId, input),
    onSuccess: ({ proposal }) => {
      queryClient.setQueryData(proposalKeys.detail(proposal.id), proposal);
      void queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Proposal accepted.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to accept proposal."))
  });
}
