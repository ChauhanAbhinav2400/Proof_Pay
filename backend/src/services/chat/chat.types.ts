import type { ChatAttachment, ChatType } from "../../models/chat";
import type { ChatMessageListOptions } from "../../repositories/chat";

export interface ChatMessageResponse {
  id: string;
  chatType: ChatType;
  referenceId: string;
  senderWallet: string;
  message: string;
  attachments: ChatAttachment[];
  createdAt: Date;
}

export interface SendMessageInput {
  chatType: ChatType;
  referenceId: string;
  senderWallet: string;
  message: string;
  attachments?: ChatAttachment[];
}

export interface GetMessagesInput {
  chatType: ChatType;
  referenceId: string;
  options?: ChatMessageListOptions;
}

export interface JoinRoomInput {
  room: string;
}

export interface LeaveRoomInput {
  room: string;
}
