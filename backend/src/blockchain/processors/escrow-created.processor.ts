import type { EscrowCreatedEvent, EventProcessorContext } from "../event.types";

export async function processEscrowCreated(
  event: EscrowCreatedEvent,
  context: EventProcessorContext
): Promise<void> {
  await context.projections.applyEscrowCreated(event);
  await context.publisher?.publish(event);
}
