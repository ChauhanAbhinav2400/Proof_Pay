import type { ProjectionType, QueryOptions, Types } from "mongoose";

import { EscrowModel } from "../../models/escrow/escrow.model";
import type {
  EscrowStatus,
  Milestone
} from "../../models/escrow/escrow.types";
import type {
  CreateEscrowInput,
  EscrowListOptions,
  EscrowRecord,
  UpdateEscrowInput
} from "./escrow.types";

const ESCROW_PROJECTION: ProjectionType<EscrowRecord> = {
  blockchainEscrowId: 1,
  projectId: 1,
  proposalId: 1,
  clientWallet: 1,
  freelancerWallet: 1,
  tokenAddress: 1,
  totalAmount: 1,
  transactionHash: 1,
  status: 1,
  milestones: 1,
  attachments: 1,
  createdAt: 1,
  updatedAt: 1
};

const RETURN_UPDATED_DOCUMENT: QueryOptions = {
  new: true,
  runValidators: true
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function createEscrow(
  input: CreateEscrowInput
): Promise<EscrowRecord> {
  try {
    const escrow = await EscrowModel.create(input);

    return escrow.toObject();
  } catch (error) {
    throwDatabaseError("Database write failed while creating escrow.", error);
  }
}

export async function findById(
  escrowId: string | Types.ObjectId
): Promise<EscrowRecord | null> {
  try {
    return await EscrowModel.findById(escrowId, ESCROW_PROJECTION)
      .lean<EscrowRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database read failed while finding escrow by id.", error);
  }
}

export async function findByBlockchainEscrowId(
  blockchainEscrowId: string
): Promise<EscrowRecord | null> {
  try {
    return await EscrowModel.findOne({ blockchainEscrowId }, ESCROW_PROJECTION)
      .lean<EscrowRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding escrow by blockchain escrow id.",
      error
    );
  }
}

export async function findByProject(
  projectId: string | Types.ObjectId
): Promise<EscrowRecord | null> {
  try {
    return await EscrowModel.findOne({ projectId }, ESCROW_PROJECTION)
      .lean<EscrowRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding escrow by project.",
      error
    );
  }
}

export async function findByProposal(
  proposalId: string | Types.ObjectId
): Promise<EscrowRecord | null> {
  try {
    return await EscrowModel.findOne({ proposalId }, ESCROW_PROJECTION)
      .lean<EscrowRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding escrow by proposal.",
      error
    );
  }
}

export async function findByClientWallet(
  clientWallet: string,
  options?: EscrowListOptions
): Promise<EscrowRecord[]> {
  const pagination = getPagination(options);

  try {
    return await EscrowModel.find({ clientWallet }, ESCROW_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<EscrowRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding escrows by client wallet.",
      error
    );
  }
}

export async function findByFreelancerWallet(
  freelancerWallet: string,
  options?: EscrowListOptions
): Promise<EscrowRecord[]> {
  const pagination = getPagination(options);

  try {
    return await EscrowModel.find({ freelancerWallet }, ESCROW_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<EscrowRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding escrows by freelancer wallet.",
      error
    );
  }
}

export async function findByStatus(
  status: EscrowStatus,
  options?: EscrowListOptions
): Promise<EscrowRecord[]> {
  const pagination = getPagination(options);

  try {
    return await EscrowModel.find({ status }, ESCROW_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<EscrowRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding escrows by status.",
      error
    );
  }
}

export async function updateEscrow(
  blockchainEscrowId: string,
  input: UpdateEscrowInput
): Promise<EscrowRecord | null> {
  try {
    return await EscrowModel.findOneAndUpdate(
      { blockchainEscrowId },
      { $set: input },
      RETURN_UPDATED_DOCUMENT
    )
      .select(ESCROW_PROJECTION)
      .lean<EscrowRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database write failed while updating escrow.", error);
  }
}

export async function updateStatus(
  blockchainEscrowId: string,
  status: EscrowStatus
): Promise<EscrowRecord | null> {
  try {
    return await EscrowModel.findOneAndUpdate(
      { blockchainEscrowId },
      { $set: { status } },
      RETURN_UPDATED_DOCUMENT
    )
      .select(ESCROW_PROJECTION)
      .lean<EscrowRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database write failed while updating escrow status.",
      error
    );
  }
}

export async function updateMilestones(
  blockchainEscrowId: string,
  milestones: Milestone[]
): Promise<EscrowRecord | null> {
  try {
    return await EscrowModel.findOneAndUpdate(
      { blockchainEscrowId },
      { $set: { milestones } },
      RETURN_UPDATED_DOCUMENT
    )
      .select(ESCROW_PROJECTION)
      .lean<EscrowRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database write failed while updating escrow milestones.",
      error
    );
  }
}

export async function exists(blockchainEscrowId: string): Promise<boolean> {
  try {
    const existingEscrow = await EscrowModel.exists({ blockchainEscrowId }).exec();

    return existingEscrow !== null;
  } catch (error) {
    throwDatabaseError(
      "Database read failed while checking escrow existence.",
      error
    );
  }
}

function getPagination(options?: EscrowListOptions): {
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
