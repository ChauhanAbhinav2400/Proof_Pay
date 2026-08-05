import { Types } from "mongoose";

export function createObjectId(): Types.ObjectId {
  return new Types.ObjectId();
}

export function createObjectIdString(): string {
  return createObjectId().toHexString();
}
