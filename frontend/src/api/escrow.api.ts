import { apiClient } from "./client";
import type { PaginationOptions } from "../types/api";
import type { BlockchainOperationResponse, CreateEscrowInput, Escrow, MilestoneSignatureInput, RaiseDisputeInput, ResolveDisputeInput } from "../types/domain";

export function createEscrow(input: CreateEscrowInput): Promise<BlockchainOperationResponse> {
  return apiClient.post<BlockchainOperationResponse>("/escrow", input).then(({ data }) => data);
}

export function getFreelancerEscrows(params?: PaginationOptions): Promise<Escrow[]> {
  return apiClient.get<Escrow[]>("/escrow", { params }).then(({ data }) => data);
}

export function getDisputedEscrows(params?: PaginationOptions): Promise<Escrow[]> {
  return apiClient.get<Escrow[]>("/escrow/disputes", { params }).then(({ data }) => data);
}

export function getEscrow(blockchainEscrowId: string): Promise<Escrow> {
  return apiClient.get<Escrow>(`/escrow/${blockchainEscrowId}`).then(({ data }) => data);
}

export function acceptEscrow(
  blockchainEscrowId: string,
  input: MilestoneSignatureInput
): Promise<BlockchainOperationResponse> {
  return apiClient
    .post<BlockchainOperationResponse>(`/escrow/${blockchainEscrowId}/accept`, input)
    .then(({ data }) => data);
}

export function approveMilestone(
  blockchainEscrowId: string,
  milestoneIndex: number,
  input: MilestoneSignatureInput
): Promise<BlockchainOperationResponse> {
  return apiClient
    .post<BlockchainOperationResponse>(`/escrow/${blockchainEscrowId}/milestones/${milestoneIndex}/approve`, input)
    .then(({ data }) => data);
}

export function submitMilestone(
  blockchainEscrowId: string,
  milestoneIndex: number
): Promise<Escrow> {
  return apiClient
    .post<Escrow>(`/escrow/${blockchainEscrowId}/milestones/${milestoneIndex}/submit`)
    .then(({ data }) => data);
}

export function raiseDispute(blockchainEscrowId: string, input?: RaiseDisputeInput): Promise<BlockchainOperationResponse> {
  return apiClient.post<BlockchainOperationResponse>(`/escrow/${blockchainEscrowId}/dispute`, input ?? {}).then(({ data }) => data);
}

export function resolveDispute(blockchainEscrowId: string, input: ResolveDisputeInput): Promise<BlockchainOperationResponse> {
  return apiClient.post<BlockchainOperationResponse>(`/escrow/${blockchainEscrowId}/resolve`, input).then(({ data }) => data);
}

export function cancelEscrow(blockchainEscrowId: string): Promise<BlockchainOperationResponse> {
  return apiClient.post<BlockchainOperationResponse>(`/escrow/${blockchainEscrowId}/cancel`).then(({ data }) => data);
}

export function escrowExists(blockchainEscrowId: string): Promise<boolean> {
  return apiClient.get<boolean>(`/escrow/${blockchainEscrowId}/exists`).then(({ data }) => data);
}
