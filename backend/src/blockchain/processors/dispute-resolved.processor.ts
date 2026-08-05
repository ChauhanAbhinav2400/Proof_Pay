import type { DisputeResolvedEvent, EventProcessorContext } from "../event.types";

export async function processDisputeResolved(
  event: DisputeResolvedEvent,
  context: EventProcessorContext
): Promise<void> {
  await context.projections.applyDisputeResolved(event);
  await context.publisher?.publish(event);
}
