import { apiClient } from "./client";
import type { ChatMessage, SendChatMessageInput } from "../types/domain";
import type { PaginationOptions } from "../types/api";

export function getProposalMessages(proposalId: string, params?: PaginationOptions): Promise<ChatMessage[]> {
  return apiClient.get<ChatMessage[]>(`/chat/proposals/${proposalId}/messages`, { params }).then(({ data }) => data);
}

export function getEscrowMessages(blockchainEscrowId: string, params?: PaginationOptions): Promise<ChatMessage[]> {
  return apiClient.get<ChatMessage[]>(`/chat/escrows/${blockchainEscrowId}/messages`, { params }).then(({ data }) => data);
}

export function sendProposalMessage(proposalId: string, input: SendChatMessageInput): Promise<ChatMessage> {
  return apiClient.post<ChatMessage>(`/chat/proposals/${proposalId}/messages`, input).then(({ data }) => data);
}

export function sendEscrowMessage(blockchainEscrowId: string, input: SendChatMessageInput): Promise<ChatMessage> {
  return apiClient.post<ChatMessage>(`/chat/escrows/${blockchainEscrowId}/messages`, input).then(({ data }) => data);
}
