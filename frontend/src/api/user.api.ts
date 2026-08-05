import { apiClient } from "./client";
import type { AuthenticatedUser } from "../types/domain";

export function getUser(userId: string): Promise<AuthenticatedUser> {
  return apiClient.get<AuthenticatedUser>(`/users/${userId}`).then(({ data }) => data);
}

export function getUserByWallet(walletAddress: string): Promise<AuthenticatedUser> {
  return apiClient.get<AuthenticatedUser>(`/users/wallets/${walletAddress}`).then(({ data }) => data);
}
