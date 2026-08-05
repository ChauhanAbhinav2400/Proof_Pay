import type { MilestoneApprovedEvent, EventProcessorContext } from "../event.types";

export async function processMilestoneApproved(
  event: MilestoneApprovedEvent,
  context: EventProcessorContext
): Promise<void> {
  await context.projections.applyMilestoneApproved(event);
  await context.publisher?.publish(event);
}
