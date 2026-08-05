import type { ProjectionType, QueryOptions, Types, UpdateWriteOpResult } from "mongoose";

import { ProposalModel } from "../../models/proposal/proposal.model";
import type { ProposalStatus } from "../../models/proposal/proposal.types";
import type {
  CreateProposalInput,
  ProposalListOptions,
  ProposalRecord,
  ProposalWriteOptions,
  UpdateProposalInput
} from "./proposal.types";

const PROPOSAL_PROJECTION: ProjectionType<ProposalRecord> = {
  projectId: 1,
  freelancerWallet: 1,
  coverLetter: 1,
  proposedBudget: 1,
  estimatedDuration: 1,
  status: 1,
  createdAt: 1,
  updatedAt: 1
};

const RETURN_UPDATED_DOCUMENT: QueryOptions = {
  new: true,
  runValidators: true
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function createProposal(
  input: CreateProposalInput
): Promise<ProposalRecord> {
  try {
    const proposal = await ProposalModel.create(input);

    return proposal.toObject();
  } catch (error) {
    throwDatabaseError("Database write failed while creating proposal.", error);
  }
}

export async function findById(
  proposalId: string | Types.ObjectId
): Promise<ProposalRecord | null> {
  try {
    return await ProposalModel.findById(proposalId, PROPOSAL_PROJECTION)
      .lean<ProposalRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database read failed while finding proposal by id.", error);
  }
}

export async function findByProject(
  projectId: string | Types.ObjectId,
  options?: ProposalListOptions
): Promise<ProposalRecord[]> {
  const pagination = getPagination(options);

  try {
    return await ProposalModel.find({ projectId }, PROPOSAL_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<ProposalRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding proposals by project.",
      error
    );
  }
}

export async function findByFreelancerWallet(
  freelancerWallet: string,
  options?: ProposalListOptions
): Promise<ProposalRecord[]> {
  const pagination = getPagination(options);

  try {
    return await ProposalModel.find({ freelancerWallet }, PROPOSAL_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<ProposalRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding proposals by freelancer wallet.",
      error
    );
  }
}

export async function findByProjectAndFreelancer(
  projectId: string | Types.ObjectId,
  freelancerWallet: string
): Promise<ProposalRecord | null> {
  try {
    return await ProposalModel.findOne(
      { projectId, freelancerWallet },
      PROPOSAL_PROJECTION
    )
      .lean<ProposalRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding proposal by project and freelancer.",
      error
    );
  }
}

export async function findByStatus(
  status: ProposalStatus,
  options?: ProposalListOptions
): Promise<ProposalRecord[]> {
  const pagination = getPagination(options);

  try {
    return await ProposalModel.find({ status }, PROPOSAL_PROJECTION)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<ProposalRecord[]>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding proposals by status.",
      error
    );
  }
}

export async function updateProposal(
  proposalId: string | Types.ObjectId,
  input: UpdateProposalInput
): Promise<ProposalRecord | null> {
  try {
    return await ProposalModel.findByIdAndUpdate(
      proposalId,
      { $set: input },
      RETURN_UPDATED_DOCUMENT
    )
      .select(PROPOSAL_PROJECTION)
      .lean<ProposalRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database write failed while updating proposal.", error);
  }
}

export async function updateStatus(
  proposalId: string | Types.ObjectId,
  status: ProposalStatus,
  options?: ProposalWriteOptions
): Promise<ProposalRecord | null> {
  try {
    return await ProposalModel.findByIdAndUpdate(
      proposalId,
      { $set: { status } },
      { ...RETURN_UPDATED_DOCUMENT, session: options?.session }
    )
      .select(PROPOSAL_PROJECTION)
      .lean<ProposalRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database write failed while updating proposal status.",
      error
    );
  }
}

export async function updateStatusWithSession(
  proposalId: string | Types.ObjectId,
  status: ProposalStatus,
  session: import("mongoose").ClientSession
): Promise<ProposalRecord | null> {
  return updateStatus(proposalId, status, { session });
}

export async function acceptProposal(
  proposalId: string | Types.ObjectId,
  options?: ProposalWriteOptions
): Promise<ProposalRecord | null> {
  return updateStatus(proposalId, "ACCEPTED", options);
}

export async function rejectRemainingProposals(
  projectId: string | Types.ObjectId,
  acceptedProposalId: string | Types.ObjectId,
  options?: ProposalWriteOptions
): Promise<UpdateWriteOpResult> {
  try {
    return await ProposalModel.updateMany(
      { projectId, _id: { $ne: acceptedProposalId } },
      { $set: { status: "REJECTED" } },
      { runValidators: true, session: options?.session }
    ).exec();
  } catch (error) {
    throwDatabaseError(
      "Database write failed while rejecting remaining proposals.",
      error
    );
  }
}

export async function withdrawProposal(
  proposalId: string | Types.ObjectId
): Promise<ProposalRecord | null> {
  return updateStatus(proposalId, "WITHDRAWN");
}

export async function exists(
  proposalId: string | Types.ObjectId
): Promise<boolean> {
  try {
    const existingProposal = await ProposalModel.exists({ _id: proposalId }).exec();

    return existingProposal !== null;
  } catch (error) {
    throwDatabaseError(
      "Database read failed while checking proposal existence.",
      error
    );
  }
}

export async function countProposals(status?: ProposalStatus): Promise<number> {
  try {
    return await ProposalModel.countDocuments(status ? { status } : {}).exec();
  } catch (error) {
    throwDatabaseError("Database read failed while counting proposals.", error);
  }
}

function getPagination(options?: ProposalListOptions): {
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
