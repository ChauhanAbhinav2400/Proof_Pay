import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model
} from "mongoose";

import {
  ESCROW_STATUSES,
  MILESTONE_STATUSES,
  type Escrow,
  type EscrowAttachment,
  type Milestone
} from "./escrow.types";

export type EscrowDocument = HydratedDocument<Escrow>;

const attachmentSchema = new Schema<EscrowAttachment>(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0 },
    uploadedBy: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    }
  },
  { _id: false }
);

const milestoneSchema = new Schema<Milestone>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    amount: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: MILESTONE_STATUSES,
      default: "PENDING",
      required: true
    },
    submissionFiles: {
      type: [attachmentSchema],
      default: []
    },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    releasedAt: { type: Date }
  },
  { _id: false }
);

const escrowSchema = new Schema<Escrow>(
  {
    blockchainEscrowId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: "Proposal",
      required: true,
      index: true
    },
    clientWallet: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    freelancerWallet: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    tokenAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    totalAmount: { type: String, required: true, trim: true },
    transactionHash: {
      type: String,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ESCROW_STATUSES,
      default: "ACTIVE",
      required: true,
      index: true
    },
    milestones: {
      type: [milestoneSchema],
      required: true,
      default: []
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

escrowSchema.index({ projectId: 1, proposalId: 1 });
escrowSchema.index({ clientWallet: 1, status: 1 });
escrowSchema.index({ freelancerWallet: 1, status: 1 });

export const EscrowModel: Model<Escrow> =
  models.Escrow
    ? (models.Escrow as Model<Escrow>)
    : model<Escrow>("Escrow", escrowSchema);
