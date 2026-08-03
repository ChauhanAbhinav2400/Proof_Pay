import { Schema, model, HydratedDocument } from "mongoose";

export interface User {
  walletAddress: string;
  username?: string;
  avatar?: string;
  nonce: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      trim: true
    },
    nonce: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const UserModel = model<User>("User", userSchema);
