import type { EscrowCancelledEvent, EventProcessorContext } from "../event.types";

export async function processEscrowCancelled(
  event: EscrowCancelledEvent,
  context: EventProcessorContext
): Promise<void> {
  await context.projections.applyEscrowCancelled(event);
  await context.publisher?.publish(event);
}
