import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model
} from "mongoose";

import type { NonceChallenge } from "./nonce-challenge.types";

export type NonceChallengeDocument = HydratedDocument<NonceChallenge>;

const nonceChallengeSchema = new Schema<NonceChallenge>(
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
    nonce: {
      type: String,
      required: true,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      expires: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const NonceChallengeModel: Model<NonceChallenge> =
  models.NonceChallenge
    ? (models.NonceChallenge as Model<NonceChallenge>)
    : model<NonceChallenge>("NonceChallenge", nonceChallengeSchema);
