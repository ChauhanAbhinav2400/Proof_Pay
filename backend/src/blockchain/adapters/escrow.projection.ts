import { escrowRepository } from "../../repositories/escrow";
import type {
  DisputeRaisedEvent,
  DisputeResolvedEvent,
  EscrowAcceptedEvent,
  EscrowCancelledEvent,
  EscrowCreatedEvent,
  EscrowEventProjectionPort,
  MilestoneApprovedEvent
} from "../event.types";

export const escrowEventProjection: EscrowEventProjectionPort = {
  async applyEscrowCreated(event: EscrowCreatedEvent): Promise<void> {
    const escrow = await escrowRepository.findByBlockchainEscrowId(
      event.escrowId
    );

    if (!escrow) {
      return;
    }

    await escrowRepository.updateEscrow(event.escrowId, {
      transactionHash: event.transactionHash,
      status: "PENDING_FREELANCER"
    });
  },

  async applyEscrowAccepted(event: EscrowAcceptedEvent): Promise<void> {
    await escrowRepository.updateStatus(event.escrowId, "ACTIVE");
  },

  async applyMilestoneApproved(event: MilestoneApprovedEvent): Promise<void> {
    const escrow = await escrowRepository.findByBlockchainEscrowId(
      event.escrowId
    );

    if (!escrow) {
      return;
    }

    const milestones = escrow.milestones.map((milestone, index) =>
      index === event.milestoneIndex
        ? {
            ...milestone,
            status: "RELEASED" as const,
            approvedAt: milestone.approvedAt ?? new Date(),
            releasedAt: milestone.releasedAt ?? new Date()
          }
        : milestone
    );
    const status = milestones.every((milestone) => milestone.status === "RELEASED")
      ? "COMPLETED"
      : escrow.status;

    await escrowRepository.updateEscrow(event.escrowId, { milestones, status });
  },

  async applyDisputeRaised(event: DisputeRaisedEvent): Promise<void> {
    await escrowRepository.updateStatus(event.escrowId, "DISPUTED");
  },

  async applyDisputeResolved(event: DisputeResolvedEvent): Promise<void> {
    await escrowRepository.updateStatus(event.escrowId, "COMPLETED");
  },

  async applyEscrowCancelled(event: EscrowCancelledEvent): Promise<void> {
    await escrowRepository.updateStatus(event.escrowId, "CANCELLED");
  }
};
