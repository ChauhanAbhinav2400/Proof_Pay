/** Event names emitted by the currently deployed ProofPay escrow contract. */
export const ESCROW_EVENT_NAMES = [
  "EscrowCreated",
  "EscrowAccepted",
  "MilestoneApproved",
  "DisputeRaised",
  "DisputeResolved",
  "EscrowCancelled"
] as const;

export type EscrowEventName = (typeof ESCROW_EVENT_NAMES)[number];

export interface BlockchainEventMetadata {
  readonly chainId: string;
  readonly contractAddress: string;
  readonly transactionHash: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly logIndex: number;
  /** Stable event identity for a durable, at-least-once consumer. */
  readonly idempotencyKey: string;
}

export interface EscrowCreatedEvent extends BlockchainEventMetadata {
  readonly name: "EscrowCreated";
  readonly escrowId: string;
  readonly client: string;
  readonly freelancer: string;
  readonly paymentToken: string;
  readonly totalAmount: string;
}

export interface EscrowAcceptedEvent extends BlockchainEventMetadata {
  readonly name: "EscrowAccepted";
  readonly escrowId: string;
  readonly freelancer: string;
}

export interface MilestoneApprovedEvent extends BlockchainEventMetadata {
  readonly name: "MilestoneApproved";
  readonly escrowId: string;
  readonly milestoneIndex: number;
  readonly amount: string;
}

export interface DisputeRaisedEvent extends BlockchainEventMetadata {
  readonly name: "DisputeRaised";
  readonly escrowId: string;
  readonly raisedBy: string;
}

export interface DisputeResolvedEvent extends BlockchainEventMetadata {
  readonly name: "DisputeResolved";
  readonly escrowId: string;
  readonly arbitrator: string;
  readonly freelancerAward: string;
  readonly clientRefund: string;
}

export interface EscrowCancelledEvent extends BlockchainEventMetadata {
  readonly name: "EscrowCancelled";
  readonly escrowId: string;
  readonly cancelledBy: string;
}

export type EscrowBlockchainEvent =
  | EscrowCreatedEvent
  | EscrowAcceptedEvent
  | MilestoneApprovedEvent
  | DisputeRaisedEvent
  | DisputeResolvedEvent
  | EscrowCancelledEvent;

/**
 * Durable implementations belong outside the listener so restarts and
 * duplicate provider deliveries can be handled without in-memory state.
 */
export interface EventIdempotencyStore {
  acquire(event: EscrowBlockchainEvent): Promise<boolean>;
  complete(idempotencyKey: string): Promise<void>;
  release(idempotencyKey: string): Promise<void>;
}

/**
 * Persistence is injected to keep the indexer independent from Mongoose and
 * to avoid placing domain rules in the listener.
 */
export interface EscrowEventProjectionPort {
  applyEscrowCreated(event: EscrowCreatedEvent): Promise<void>;
  applyEscrowAccepted(event: EscrowAcceptedEvent): Promise<void>;
  applyMilestoneApproved(event: MilestoneApprovedEvent): Promise<void>;
  applyDisputeRaised(event: DisputeRaisedEvent): Promise<void>;
  applyDisputeResolved(event: DisputeResolvedEvent): Promise<void>;
  applyEscrowCancelled(event: EscrowCancelledEvent): Promise<void>;
}

/** Optional outbound adapter; processors never import Socket.IO directly. */
export interface BlockchainEventPublisher {
  publish(event: EscrowBlockchainEvent): Promise<void>;
}

export interface EventProcessorContext {
  readonly projections: EscrowEventProjectionPort;
  readonly publisher?: BlockchainEventPublisher;
}

export type EscrowEventProcessor<TEvent extends EscrowBlockchainEvent> = (
  event: TEvent,
  context: EventProcessorContext
) => Promise<void>;

export interface EventRouterDependencies extends EventProcessorContext {
  readonly idempotencyStore: EventIdempotencyStore;
  readonly onProcessingError?: (
    error: unknown,
    event: EscrowBlockchainEvent
  ) => void;
}

export interface IndexerContractDefinition {
  readonly contract: import("ethers").Contract;
  readonly chainId: string;
}

export interface BlockchainEventIndexerDependencies
  extends EventRouterDependencies {
  readonly contracts: readonly IndexerContractDefinition[];
  readonly onListenerError?: (error: unknown, eventName: EscrowEventName) => void;
}

export interface BlockchainEventIndexer {
  start(): void;
  stop(): void;
}
