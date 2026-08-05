import type { EscrowAcceptedEvent, EventProcessorContext } from "../event.types";

export async function processEscrowAccepted(
  event: EscrowAcceptedEvent,
  context: EventProcessorContext
): Promise<void> {
  await context.projections.applyEscrowAccepted(event);
  await context.publisher?.publish(event);
}
