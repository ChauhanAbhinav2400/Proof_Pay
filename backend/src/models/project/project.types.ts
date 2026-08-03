export const PROJECT_STATUSES = [
  "OPEN",
  "ESCROW_CREATED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectAttachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface Project {
  clientWallet: string;
  title: string;
  description: string;
  budget: string;
  currency: string;
  expectedDuration: string;
  skills: string[];
  attachments: ProjectAttachment[];
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}
