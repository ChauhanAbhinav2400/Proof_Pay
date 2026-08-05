import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/user.service";

export function useCurrentUser(userId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ["current-user", userId], queryFn: () => userService.getUser(userId!), enabled: enabled && Boolean(userId), retry: 1 });
}
