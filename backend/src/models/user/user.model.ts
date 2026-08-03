import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model
} from "mongoose";

import { USER_PERMISSIONS, type User } from "./user.types";

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    displayName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2048
    },
    permissions: {
      type: [String],
      enum: USER_PERMISSIONS,
      default: ["USER"],
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const UserModel: Model<User> =
  models.User ? (models.User as Model<User>) : model<User>("User", userSchema);
