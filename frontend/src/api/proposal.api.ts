import { apiClient } from "./client";
import type { PaginationOptions } from "../types/api";
import type {
  AcceptProposalInput,
  AcceptProposalResponse,
  CreateProposalInput,
  Proposal,
  UpdateProposalInput
} from "../types/domain";

export function getProposal(proposalId: string): Promise<Proposal> {
  return apiClient.get<Proposal>(`/proposals/${proposalId}`).then(({ data }) => data);
}

export function getFreelancerProposals(freelancerWallet: string, params?: PaginationOptions): Promise<Proposal[]> {
  return apiClient.get<Proposal[]>(`/proposals/freelancers/${freelancerWallet}`, { params }).then(({ data }) => data);
}

export function getProjectProposals(projectId: string, params?: PaginationOptions): Promise<Proposal[]> {
  return apiClient.get<Proposal[]>(`/projects/${projectId}/proposals`, { params }).then(({ data }) => data);
}

export function createProposal(projectId: string, input: CreateProposalInput): Promise<Proposal> {
  return apiClient.post<Proposal>(`/projects/${projectId}/proposals`, input).then(({ data }) => data);
}

export function updateProposal(proposalId: string, input: UpdateProposalInput): Promise<Proposal> {
  return apiClient.patch<Proposal>(`/proposals/${proposalId}`, input).then(({ data }) => data);
}

export function withdrawProposal(proposalId: string): Promise<Proposal> {
  return apiClient.post<Proposal>(`/proposals/${proposalId}/withdraw`).then(({ data }) => data);
}

export function acceptProposal(proposalId: string, input: AcceptProposalInput): Promise<AcceptProposalResponse> {
  return apiClient.post<AcceptProposalResponse>(`/proposals/${proposalId}/accept`, input).then(({ data }) => data);
}

export function proposalExists(proposalId: string): Promise<boolean> {
  return apiClient.get<boolean>(`/proposals/${proposalId}/exists`).then(({ data }) => data);
}
