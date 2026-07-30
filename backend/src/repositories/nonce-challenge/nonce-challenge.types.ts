import type { Types } from "mongoose";

import type { NonceChallenge } from "../../models/nonce-challenge";

export interface NonceChallengeRecord extends NonceChallenge {
  _id: Types.ObjectId;
}

export interface UpsertNonceChallengeInput {
  walletAddress: string;
  nonce: string;
  expiresAt: Date;
}
