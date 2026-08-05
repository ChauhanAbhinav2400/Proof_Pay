export type UserPermission = "USER" | "ADMIN" | "ARBITRATOR";

export interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  permissions: UserPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthNonceResponse {
  nonce: string;
}

export interface WalletVerificationResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface JwtPayload {
  userId: string;
  walletAddress: string;
  permissions: UserPermission[];
  exp?: number;
}

export type ProjectStatus = "OPEN" | "ESCROW_CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ProposalStatus = "PENDING" | "ACCEPTED" | "CLOSED" | "REJECTED" | "WITHDRAWN";

export interface ProjectAttachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface Project {
  id: string;
  clientWallet: string;
  title: string;
  description: string;
  budget: string;
  currency: string;
  expectedDuration: string;
  skills: string[];
  attachments: ProjectAttachment[];
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  title: string;
  description: string;
  budget: string;
  currency: string;
  expectedDuration: string;
  skills: string[];
  attachments?: ProjectAttachment[];
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  budget?: string;
  currency?: string;
  expectedDuration?: string;
  skills?: string[];
  attachments?: ProjectAttachment[];
}

export interface Proposal {
  id: string;
  projectId: string;
  freelancerWallet: string;
  coverLetter: string;
  proposedBudget: string;
  estimatedDuration: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProposalInput {
  coverLetter: string;
  proposedBudget: string;
  estimatedDuration: string;
}

export interface UpdateProposalInput {
  coverLetter?: string;
  proposedBudget?: string;
  estimatedDuration?: string;
}

export interface CreateEscrowMilestoneInput {
  title: string;
  description: string;
  amount: string;
}

export type EscrowStatus = "PENDING_FREELANCER" | "ACTIVE" | "DISPUTED" | "COMPLETED" | "CANCELLED";
export type MilestoneStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "RELEASED" | "DISPUTED";

export interface EscrowAttachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface EscrowMilestone {
  title: string;
  description: string;
  amount: string;
  status: MilestoneStatus;
  submissionFiles: EscrowAttachment[];
  submittedAt?: string;
  approvedAt?: string;
  releasedAt?: string;
}

export interface AcceptProposalInput {
  tokenAddress: string;
  acceptanceDeadline: string;
  milestones: CreateEscrowMilestoneInput[];
  attachments?: ProjectAttachment[];
  blockchainEscrowId?: string;
  transactionHash?: string;
}

export interface CreateEscrowInput extends AcceptProposalInput {
  projectId: string;
  proposalId: string;
}

export interface EscrowSummary {
  id: string;
  blockchainEscrowId: string;
  projectId: string;
  proposalId: string;
  clientWallet: string;
  freelancerWallet: string;
  tokenAddress: string;
  totalAmount: string;
  transactionHash?: string;
  status: EscrowStatus;
  milestones: EscrowMilestone[];
  attachments: EscrowAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type Escrow = EscrowSummary;

export interface BlockchainOperationResponse {
  escrow: Escrow;
  transactionHash: string;
}

export interface MilestoneSignatureInput {
  deadline: string;
  signature: string;
}

export interface ResolveDisputeInput {
  arbitrator: string;
  freelancerAward: string;
  clientRefund: string;
  deadline: string;
  signature: string;
}

export interface RaiseDisputeInput {
  transactionHash?: string;
}

export type ChatType = "PROPOSAL" | "ESCROW";

export interface ChatAttachment {
  key: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface ChatMessage {
  id: string;
  chatType: ChatType;
  referenceId: string;
  senderWallet: string;
  message: string;
  attachments: ChatAttachment[];
  createdAt: string;
}

export interface SendChatMessageInput {
  message: string;
  attachments?: ChatAttachment[];
}

export interface AcceptProposalResponse {
  proposal: Proposal;
  escrow: BlockchainOperationResponse;
}

export interface UploadFileResult {
  key: string;
  bucket: string;
  url: string;
  contentType: string;
  size: number;
  etag?: string;
}

export interface SignedDownloadUrlResult {
  key: string;
  url: string;
  expiresInSeconds: number;
}

export interface AdminSummary {
  users: {
    total: number;
  };
  projects: {
    total: number;
    open: number;
    cancelled: number;
    completed: number;
  };
  proposals: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  escrows: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    disputed: number;
    cancelled: number;
  };
  recentProjects: Project[];
  recentEscrows: Escrow[];
  recentDisputes: Escrow[];
}
