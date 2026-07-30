import type { Types } from "mongoose";

import type {
  ChatAttachment,
  ChatMessage,
  ChatType
} from "../../models/chat/chat-message.types";

export interface ChatMessageRecord extends ChatMessage {
  _id: Types.ObjectId;
}

export interface CreateMessageInput {
  chatType: ChatType;
  referenceId: Types.ObjectId | string;
  senderWallet: string;
  message: string;
  attachments?: ChatAttachment[];
}

export interface UpdateMessageInput {
  message?: string;
  attachments?: ChatAttachment[];
}

export interface ChatMessageListOptions {
  limit?: number;
  skip?: number;
  sort?: ChatMessageSortOptions;
}

export type ChatMessageSortOptions = Partial<
  Record<"createdAt", 1 | -1 | "asc" | "desc">
>;
