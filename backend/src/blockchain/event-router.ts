import { processDisputeRaised } from "./processors/dispute-raised.processor";
import { processDisputeResolved } from "./processors/dispute-resolved.processor";
import { processEscrowAccepted } from "./processors/escrow-accepted.processor";
import { processEscrowCancelled } from "./processors/escrow-cancelled.processor";
import { processEscrowCreated } from "./processors/escrow-created.processor";
import { processMilestoneApproved } from "./processors/milestone-approved.processor";
import type {
  EscrowBlockchainEvent,
  EventRouterDependencies
} from "./event.types";

/** Routes one normalized log to its event-specific persistence processor. */
export async function routeBlockchainEvent(
  event: EscrowBlockchainEvent,
  dependencies: EventRouterDependencies
): Promise<void> {
  let acquired = false;

  try {
    acquired = await dependencies.idempotencyStore.acquire(event);

    if (!acquired) {
      return;
    }

    await processEvent(event, dependencies);
    await dependencies.idempotencyStore.complete(event.idempotencyKey);
  } catch (error) {
    if (acquired) {
      try {
        await dependencies.idempotencyStore.release(event.idempotencyKey);
      } catch (releaseError) {
        dependencies.onProcessingError?.(releaseError, event);
      }
    }

    dependencies.onProcessingError?.(error, event);
  }
}

async function processEvent(
  event: EscrowBlockchainEvent,
  dependencies: EventRouterDependencies
): Promise<void> {
  switch (event.name) {
    case "EscrowCreated":
      await processEscrowCreated(event, dependencies);
      return;
    case "EscrowAccepted":
      await processEscrowAccepted(event, dependencies);
      return;
    case "MilestoneApproved":
      await processMilestoneApproved(event, dependencies);
      return;
    case "DisputeRaised":
      await processDisputeRaised(event, dependencies);
      return;
    case "DisputeResolved":
      await processDisputeResolved(event, dependencies);
      return;
    case "EscrowCancelled":
      await processEscrowCancelled(event, dependencies);
  }
}
