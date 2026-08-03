import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model
} from "mongoose";

import { PROPOSAL_STATUSES, type Proposal } from "./proposal.types";

export type ProposalDocument = HydratedDocument<Proposal>;

const proposalSchema = new Schema<Proposal>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    freelancerWallet: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    coverLetter: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000
    },
    proposedBudget: { type: String, required: true, trim: true },
    estimatedDuration: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: PROPOSAL_STATUSES,
      default: "PENDING",
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

proposalSchema.index({ projectId: 1, freelancerWallet: 1 }, { unique: true });
proposalSchema.index({ projectId: 1, status: 1 });

export const ProposalModel: Model<Proposal> =
  models.Proposal
    ? (models.Proposal as Model<Proposal>)
    : model<Proposal>("Proposal", proposalSchema);
