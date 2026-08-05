import type { DisputeRaisedEvent, EventProcessorContext } from "../event.types";

export async function processDisputeRaised(
  event: DisputeRaisedEvent,
  context: EventProcessorContext
): Promise<void> {
  await context.projections.applyDisputeRaised(event);
  await context.publisher?.publish(event);
}
