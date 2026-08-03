import type { Types } from "mongoose";

export const CHAT_TYPES = ["PROPOSAL", "ESCROW"] as const;

export type ChatType = (typeof CHAT_TYPES)[number];

export interface ChatAttachment {
  key: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface ChatMessage {
  chatType: ChatType;
  referenceId: Types.ObjectId | string;
  senderWallet: string;
  message: string;
  attachments: ChatAttachment[];
  createdAt: Date;
}
