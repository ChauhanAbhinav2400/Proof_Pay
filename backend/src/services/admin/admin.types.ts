import type { EscrowResponse } from "../escrow";
import type { ProjectResponse } from "../project";

export interface AdminSummaryResponse {
  users: {
    total: number;
  };
  projects: {
    total: number;
    open: number;
    cancelled: number;
    completed: number;
  };
  proposals: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  escrows: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    disputed: number;
    cancelled: number;
  };
  recentProjects: ProjectResponse[];
  recentEscrows: EscrowResponse[];
  recentDisputes: EscrowResponse[];
}
