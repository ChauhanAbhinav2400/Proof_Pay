import { NonceChallengeModel } from "../../models/nonce-challenge";
import type {
  NonceChallengeRecord,
  UpsertNonceChallengeInput
} from "./nonce-challenge.types";

export async function upsertNonceChallenge(
  input: UpsertNonceChallengeInput
): Promise<NonceChallengeRecord> {
  try {
    const challenge = await NonceChallengeModel.findOneAndUpdate(
      { walletAddress: input.walletAddress },
      {
        $set: {
          nonce: input.nonce,
          expiresAt: input.expiresAt
        },
        $setOnInsert: {
          walletAddress: input.walletAddress
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    )
      .lean<NonceChallengeRecord>()
      .exec();

    if (!challenge) {
      throw new Error("Nonce challenge was not returned.");
    }

    return challenge;
  } catch (error) {
    throwDatabaseError("Database write failed while storing nonce challenge.", error);
  }
}

export async function findActiveNonceChallenge(
  walletAddress: string
): Promise<NonceChallengeRecord | null> {
  try {
    return await NonceChallengeModel.findOne({
      walletAddress,
      expiresAt: { $gt: new Date() }
    })
      .lean<NonceChallengeRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database read failed while finding nonce challenge.", error);
  }
}

export async function consumeNonceChallenge(
  walletAddress: string,
  nonce: string
): Promise<NonceChallengeRecord | null> {
  try {
    return await NonceChallengeModel.findOneAndDelete({
      walletAddress,
      nonce,
      expiresAt: { $gt: new Date() }
    })
      .lean<NonceChallengeRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database write failed while consuming nonce challenge.", error);
  }
}

function throwDatabaseError(message: string, cause: unknown): never {
  throw new Error(message, { cause });
}
