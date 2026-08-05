import { apiClient } from "./client";
import type { AdminSummary } from "../types/domain";

export function getAdminSummary(): Promise<AdminSummary> {
  return apiClient.get<AdminSummary>("/admin/summary").then(({ data }) => data);
}
