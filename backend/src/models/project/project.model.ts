import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model
} from "mongoose";

import {
  PROJECT_STATUSES,
  type Project,
  type ProjectAttachment
} from "./project.types";

export type ProjectDocument = HydratedDocument<Project>;

const attachmentSchema = new Schema<ProjectAttachment>(
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

const projectSchema = new Schema<Project>(
  {
    clientWallet: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 160
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000
    },
    budget: { type: String, required: true, trim: true },
    currency: { type: String, required: true, trim: true },
    expectedDuration: { type: String, required: true, trim: true, maxlength: 120 },
    skills: {
      type: [String],
      required: true,
      default: []
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "OPEN",
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

projectSchema.index({ clientWallet: 1, status: 1 });

export const ProjectModel: Model<Project> =
  models.Project
    ? (models.Project as Model<Project>)
    : model<Project>("Project", projectSchema);
