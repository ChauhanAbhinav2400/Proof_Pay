import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { chatService } from "../../../services/chat.service";
import type { PaginationOptions } from "../../../types/api";
import type { ChatMessage, ChatType, SendChatMessageInput } from "../../../types/domain";
import { getApiErrorMessage } from "../../../utils/api-error";

export const chatKeys = {
  all: ["chat"] as const,
  conversation: (chatType: ChatType, referenceId: string | undefined, params?: PaginationOptions) =>
    [...chatKeys.all, chatType, referenceId ?? "", params ?? {}] as const
};

export function useChatMessages(chatType: ChatType, referenceId: string | undefined, params?: PaginationOptions) {
  return useQuery({
    queryKey: chatKeys.conversation(chatType, referenceId, params),
    queryFn: () =>
      chatType === "PROPOSAL"
        ? chatService.getProposalMessages(referenceId!, params)
        : chatService.getEscrowMessages(referenceId!, params),
    enabled: Boolean(referenceId),
    retry: 1
  });
}

export function useSendChatMessage(chatType: ChatType, referenceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendChatMessageInput) => {
      if (!referenceId) throw new Error("Chat reference is required.");
      return chatType === "PROPOSAL"
        ? chatService.sendProposalMessage(referenceId, input)
        : chatService.sendEscrowMessage(referenceId, input);
    },
    onSuccess: (message) => {
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: chatKeys.conversation(chatType, referenceId) }, (current) =>
        current ? [...current, message] : [message]
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversation(chatType, referenceId) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Unable to send message."))
  });
}
