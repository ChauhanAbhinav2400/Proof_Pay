import { useQuery } from "@tanstack/react-query";

import { adminService } from "../../../services/admin.service";

export const adminKeys = {
  summary: ["admin", "summary"] as const
};

export function useAdminSummary() {
  return useQuery({
    queryKey: adminKeys.summary,
    queryFn: adminService.getAdminSummary,
    refetchInterval: 30_000,
    retry: 1
  });
}
