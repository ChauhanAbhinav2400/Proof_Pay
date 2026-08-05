import type { ProofPaySocketServer } from "../../socket";
import type {
  BlockchainEventPublisher,
  EscrowBlockchainEvent
} from "../event.types";

export function createSocketBlockchainEventPublisher(
  io: ProofPaySocketServer
): BlockchainEventPublisher {
  return {
    async publish(event: EscrowBlockchainEvent): Promise<void> {
      const payload = { payload: event };

      switch (event.name) {
        case "EscrowCreated":
          io.emit("escrowCreated", payload);
          break;
        case "EscrowCancelled":
          io.emit("escrowCancelled", payload);
          break;
        case "DisputeRaised":
          io.emit("disputeRaised", payload);
          break;
        case "DisputeResolved":
          io.emit("disputeResolved", payload);
          break;
        case "EscrowAccepted":
        case "MilestoneApproved":
          io.emit("escrowUpdated", payload);
          break;
      }
    }
  };
}
