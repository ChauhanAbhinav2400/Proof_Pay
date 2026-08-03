import type {
  ChatMessageResponse,
  GetMessagesInput,
  JoinRoomInput,
  LeaveRoomInput,
  SendMessageInput
} from "./chat.types";
import { chatRepository } from "../../repositories/chat";
import type { ChatMessageRecord } from "../../repositories/chat";

/**
 * Defines chat use cases independently from realtime transport implementation.
 */
export async function sendMessage(
  input: SendMessageInput
): Promise<ChatMessageResponse> {
  const message = await chatRepository.createMessage({
    chatType: input.chatType,
    referenceId: requireText(input.referenceId, "Chat reference is required."),
    senderWallet: requireText(input.senderWallet, "Sender wallet is required.").toLowerCase(),
    message: requireText(input.message, "Message cannot be empty."),
    attachments: input.attachments ?? []
  });

  return toChatMessageResponse(message);
}

export async function getMessages(
  input: GetMessagesInput
): Promise<ChatMessageResponse[]> {
  const referenceId = requireText(input.referenceId, "Chat reference is required.");
  const messages =
    input.chatType === "PROPOSAL"
      ? await chatRepository.findProposalMessages(referenceId, input.options)
      : await chatRepository.findEscrowMessages(referenceId, input.options);

  return messages.map(toChatMessageResponse);
}

export async function joinRoom(_input: JoinRoomInput): Promise<void> {
  requireText(_input.room, "Room is required.");
}

export async function leaveRoom(_input: LeaveRoomInput): Promise<void> {
  requireText(_input.room, "Room is required.");
}

function requireText(value: string, message: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
}

function toChatMessageResponse(message: ChatMessageRecord): ChatMessageResponse {
  return {
    id: message._id.toString(),
    chatType: message.chatType,
    referenceId: message.referenceId.toString(),
    senderWallet: message.senderWallet,
    message: message.message,
    attachments: message.attachments,
    createdAt: message.createdAt
  };
}
