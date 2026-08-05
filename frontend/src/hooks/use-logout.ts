import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLogout(action: () => void) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async () => { queryClient.clear(); action(); } });
}
