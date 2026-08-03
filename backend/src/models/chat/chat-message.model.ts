import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model
} from "mongoose";

import {
  CHAT_TYPES,
  type ChatAttachment,
  type ChatMessage
} from "./chat-message.types";

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

const attachmentSchema = new Schema<ChatAttachment>(
  {
    key: { type: String, required: true, trim: true, maxlength: 2048 },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0 },
    uploadedBy: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    }
  },
  { _id: false }
);

const chatMessageSchema = new Schema<ChatMessage>(
  {
    chatType: {
      type: String,
      enum: CHAT_TYPES,
      required: true,
      index: true
    },
    referenceId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true
    },
    senderWallet: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

chatMessageSchema.index({ chatType: 1, referenceId: 1, createdAt: 1 });

export const ChatMessageModel: Model<ChatMessage> =
  models.ChatMessage
    ? (models.ChatMessage as Model<ChatMessage>)
    : model<ChatMessage>("ChatMessage", chatMessageSchema);
