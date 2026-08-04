import { escrowRepository } from "../../repositories/escrow";
import { projectRepository } from "../../repositories/project";
import { proposalRepository } from "../../repositories/proposal";
import { userRepository } from "../../repositories/user";
import type { AdminSummaryResponse } from "./admin.types";

export async function getSummary(): Promise<AdminSummaryResponse> {
  const [
    totalUsers,
    totalProjects,
    openProjects,
    cancelledProjects,
    escrowCreatedProjects,
    totalProposals,
    pendingProposals,
    acceptedProposals,
    rejectedProposals,
    totalEscrows,
    pendingEscrows,
    activeEscrows,
    completedEscrows,
    disputedEscrows,
    cancelledEscrows,
    recentProjects,
    recentEscrows,
    recentDisputes
  ] = await Promise.all([
    userRepository.countUsers(),
    projectRepository.countProjects(),
    projectRepository.countProjects("OPEN"),
    projectRepository.countProjects("CANCELLED"),
    projectRepository.countProjects("ESCROW_CREATED"),
    proposalRepository.countProposals(),
    proposalRepository.countProposals("PENDING"),
    proposalRepository.countProposals("ACCEPTED"),
    proposalRepository.countProposals("REJECTED"),
    escrowRepository.countEscrows(),
    escrowRepository.countEscrows("PENDING_FREELANCER"),
    escrowRepository.countEscrows("ACTIVE"),
    escrowRepository.countEscrows("COMPLETED"),
    escrowRepository.countEscrows("DISPUTED"),
    escrowRepository.countEscrows("CANCELLED"),
    projectRepository.findRecentProjects({ limit: 5, sort: { createdAt: -1 } }),
    escrowRepository.findRecentEscrows({ limit: 5, sort: { createdAt: -1 } }),
    escrowRepository.findRecentDisputedEscrows({
      limit: 5,
      sort: { updatedAt: -1 }
    })
  ]);

  return {
    users: { total: totalUsers },
    projects: {
      total: totalProjects,
      open: openProjects,
      cancelled: cancelledProjects,
      completed: escrowCreatedProjects
    },
    proposals: {
      total: totalProposals,
      pending: pendingProposals,
      accepted: acceptedProposals,
      rejected: rejectedProposals
    },
    escrows: {
      total: totalEscrows,
      pending: pendingEscrows,
      active: activeEscrows,
      completed: completedEscrows,
      disputed: disputedEscrows,
      cancelled: cancelledEscrows
    },
    recentProjects: recentProjects.map((project) => ({
      id: project._id.toString(),
      clientWallet: project.clientWallet,
      title: project.title,
      description: project.description,
      budget: project.budget,
      currency: project.currency,
      expectedDuration: project.expectedDuration,
      skills: project.skills,
      attachments: project.attachments,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    })),
    recentEscrows: recentEscrows.map(toEscrowResponse),
    recentDisputes: recentDisputes.map(toEscrowResponse)
  };
}

function toEscrowResponse(
  escrow: Awaited<ReturnType<typeof escrowRepository.findRecentEscrows>>[number]
) {
  return {
    id: escrow._id.toString(),
    blockchainEscrowId: escrow.blockchainEscrowId,
    projectId: escrow.projectId.toString(),
    proposalId: escrow.proposalId.toString(),
    clientWallet: escrow.clientWallet,
    freelancerWallet: escrow.freelancerWallet,
    tokenAddress: escrow.tokenAddress,
    totalAmount: escrow.totalAmount,
    transactionHash: escrow.transactionHash,
    status: escrow.status,
    milestones: escrow.milestones,
    attachments: escrow.attachments,
    createdAt: escrow.createdAt,
    updatedAt: escrow.updatedAt
  };
}
