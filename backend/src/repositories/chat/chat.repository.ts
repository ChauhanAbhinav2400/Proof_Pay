import type { ProjectionType, QueryOptions, Types } from "mongoose";

import { ChatMessageModel } from "../../models/chat/chat-message.model";
import type { ChatType } from "../../models/chat/chat-message.types";
import type {
  ChatMessageListOptions,
  ChatMessageRecord,
  CreateMessageInput,
  UpdateMessageInput
} from "./chat.types";

const CHAT_MESSAGE_PROJECTION: ProjectionType<ChatMessageRecord> = {
  chatType: 1,
  referenceId: 1,
  senderWallet: 1,
  message: 1,
  attachments: 1,
  createdAt: 1
};

const RETURN_UPDATED_DOCUMENT: QueryOptions = {
  new: true,
  runValidators: true
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function createMessage(
  input: CreateMessageInput
): Promise<ChatMessageRecord> {
  try {
    const message = await ChatMessageModel.create(input);

    return message.toObject();
  } catch (error) {
    throwDatabaseError("Database write failed while creating chat message.", error);
  }
}

export async function findById(
  messageId: string | Types.ObjectId
): Promise<ChatMessageRecord | null> {
  try {
    return await ChatMessageModel.findById(messageId, CHAT_MESSAGE_PROJECTION)
      .lean<ChatMessageRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding chat message by id.",
      error
    );
  }
}

export async function findProposalMessages(
  proposalId: string | Types.ObjectId,
  options?: ChatMessageListOptions
): Promise<ChatMessageRecord[]> {
  return findConversation("PROPOSAL", proposalId, options);
}

export async function findEscrowMessages(
  blockchainEscrowId: string,
  options?: ChatMessageListOptions
): Promise<ChatMessageRecord[]> {
  return findConversation("ESCROW", blockchainEscrowId, options);
}

export async function findConversation(
  chatType: ChatType,
  referenceId: string | Types.ObjectId,
  options?: ChatMessageListOptions
): Promise<ChatMessageRecord[]> {
  const pagination = getPagination(options);

  try {
    return await ChatMessageModel.find(
      { chatType, referenceId },
      CHAT_MESSAGE_PROJECTION
    )
      .sort(options?.sort ?? { createdAt: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<ChatMessageRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding chat conversation.",
      error
    );
  }
}

export async function updateMessage(
  messageId: string | Types.ObjectId,
  input: UpdateMessageInput
): Promise<ChatMessageRecord | null> {
  try {
    return await ChatMessageModel.findByIdAndUpdate(
      messageId,
      { $set: input },
      RETURN_UPDATED_DOCUMENT
    )
      .select(CHAT_MESSAGE_PROJECTION)
      .lean<ChatMessageRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database write failed while updating chat message.", error);
  }
}

export async function deleteMessage(
  messageId: string | Types.ObjectId
): Promise<boolean> {
  try {
    const result = await ChatMessageModel.deleteOne({ _id: messageId }).exec();

    return result.deletedCount === 1;
  } catch (error) {
    throwDatabaseError("Database write failed while deleting chat message.", error);
  }
}

export async function exists(
  messageId: string | Types.ObjectId
): Promise<boolean> {
  try {
    const existingMessage = await ChatMessageModel.exists({ _id: messageId }).exec();

    return existingMessage !== null;
  } catch (error) {
    throwDatabaseError(
      "Database read failed while checking chat message existence.",
      error
    );
  }
}

function getPagination(options?: ChatMessageListOptions): {
  limit: number;
  skip: number;
} {
  return {
    limit: Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT),
    skip: Math.max(options?.skip ?? 0, 0)
  };
}

function throwDatabaseError(message: string, cause: unknown): never {
  throw new Error(message, { cause });
}
