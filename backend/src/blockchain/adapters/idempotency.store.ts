import type {
  EscrowBlockchainEvent,
  EventIdempotencyStore
} from "../event.types";

const completedEvents = new Set<string>();
const processingEvents = new Set<string>();

export const inMemoryEventIdempotencyStore: EventIdempotencyStore = {
  async acquire(event: EscrowBlockchainEvent): Promise<boolean> {
    if (
      completedEvents.has(event.idempotencyKey) ||
      processingEvents.has(event.idempotencyKey)
    ) {
      return false;
    }

    processingEvents.add(event.idempotencyKey);
    return true;
  },

  async complete(idempotencyKey: string): Promise<void> {
    processingEvents.delete(idempotencyKey);
    completedEvents.add(idempotencyKey);
  },

  async release(idempotencyKey: string): Promise<void> {
    processingEvents.delete(idempotencyKey);
  }
};
