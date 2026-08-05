import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { escrowService } from "../../../services/escrow.service";
import type { PaginationOptions } from "../../../types/api";
import type { CreateEscrowInput, Escrow, MilestoneSignatureInput, RaiseDisputeInput, ResolveDisputeInput } from "../../../types/domain";
import { getApiErrorMessage } from "../../../utils/api-error";
import { projectKeys } from "../../projects/hooks/use-projects";
import { proposalKeys } from "../../proposals/hooks/use-proposals";

export const escrowKeys = {
  all: ["escrows"] as const,
  lists: () => [...escrowKeys.all, "list"] as const,
  freelancer: (params?: PaginationOptions) => [...escrowKeys.lists(), "freelancer", params ?? {}] as const,
  disputed: (params?: PaginationOptions) => [...escrowKeys.lists(), "disputed", params ?? {}] as const,
  detail: (blockchainEscrowId: string | undefined) => [...escrowKeys.all, "detail", blockchainEscrowId ?? ""] as const
};

export function useEscrows(params?: PaginationOptions) {
  return useQuery({
    queryKey: escrowKeys.freelancer(params),
    queryFn: () => escrowService.getFreelancerEscrows(params),
    retry: 1
  });
}

export function useDisputedEscrows(params?: PaginationOptions) {
  return useQuery({
    queryKey: escrowKeys.disputed(params),
    queryFn: () => escrowService.getDisputedEscrows(params),
    retry: 1
  });
}

export function useEscrow(blockchainEscrowId: string | undefined) {
  return useQuery({
    queryKey: escrowKeys.detail(blockchainEscrowId),
    queryFn: () => escrowService.getEscrow(blockchainEscrowId!),
    enabled: Boolean(blockchainEscrowId),
    retry: 1
  });
}

export function useEscrowExists(blockchainEscrowId: string | undefined) {
  return useQuery({
    queryKey: [...escrowKeys.detail(blockchainEscrowId), "exists"] as const,
    queryFn: () => escrowService.escrowExists(blockchainEscrowId!),
    enabled: Boolean(blockchainEscrowId),
    retry: 1
  });
}

export function useCreateEscrow() {
  return useEscrowMutation((input: CreateEscrowInput) => escrowService.createEscrow(input), "Escrow created.");
}

export function useAcceptEscrow() {
  return useEscrowMutation(({ blockchainEscrowId, input }: { blockchainEscrowId: string; input: MilestoneSignatureInput }) =>
    escrowService.acceptEscrow(blockchainEscrowId, input), "Escrow accepted.");
}

export function useApproveMilestone() {
  return useEscrowMutation(({ blockchainEscrowId, milestoneIndex, input }: { blockchainEscrowId: string; milestoneIndex: number; input: MilestoneSignatureInput }) =>
    escrowService.approveMilestone(blockchainEscrowId, milestoneIndex, input), "Milestone approved.");
}

export function useSubmitMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blockchainEscrowId, milestoneIndex }: { blockchainEscrowId: string; milestoneIndex: number }) =>
      escrowService.submitMilestone(blockchainEscrowId, milestoneIndex),
    onSuccess: (escrow: Escrow) => {
      queryClient.setQueryData(escrowKeys.detail(escrow.blockchainEscrowId), escrow);
      void queryClient.invalidateQueries({ queryKey: escrowKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: proposalKeys.all });
      toast.success("Milestone submitted for client review.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to submit milestone."))
  });
}

export function useRaiseDispute() {
  return useEscrowMutation(({ blockchainEscrowId, input }: { blockchainEscrowId: string; input?: RaiseDisputeInput }) =>
    escrowService.raiseDispute(blockchainEscrowId, input), "Dispute raised.");
}

export function useResolveDispute() {
  return useEscrowMutation(({ blockchainEscrowId, input }: { blockchainEscrowId: string; input: ResolveDisputeInput }) =>
    escrowService.resolveDispute(blockchainEscrowId, input), "Dispute resolved.");
}

export function useCancelEscrow() {
  return useEscrowMutation((blockchainEscrowId: string) => escrowService.cancelEscrow(blockchainEscrowId), "Escrow cancelled.");
}

function useEscrowMutation<TVariables>(
  mutationFn: (variables: TVariables) => ReturnType<typeof escrowService.raiseDispute>,
  successMessage: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      queryClient.setQueryData(escrowKeys.detail(result.escrow.blockchainEscrowId), result.escrow);
      void queryClient.invalidateQueries({ queryKey: escrowKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: proposalKeys.all });
      toast.success(`${successMessage} Transaction: ${result.transactionHash.slice(0, 10)}...`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Blockchain operation failed."))
  });
}
