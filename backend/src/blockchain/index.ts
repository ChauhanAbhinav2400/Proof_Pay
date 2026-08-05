import { proofPayEscrowEventContract } from "./contract";
import { routeBlockchainEvent } from "./event-router";
import { createContractEventListener } from "./listener";
import { blockchainEventProvider } from "./provider";
import type {
  BlockchainEventIndexer,
  BlockchainEventIndexerDependencies,
  EventRouterDependencies,
  IndexerContractDefinition
} from "./event.types";

export * from "./event.types";
export * from "./event-router";
export * from "./listener";

/**
 * Builds an indexer from explicit adapters. Multiple contracts can be supplied
 * without changing routing or processor code.
 */
export function createBlockchainEventIndexer(
  dependencies: BlockchainEventIndexerDependencies
): BlockchainEventIndexer {
  const listeners = dependencies.contracts.map((definition) =>
    createContractEventListener({
      ...definition,
      onEvent: (event) => routeBlockchainEvent(event, dependencies),
      onError: dependencies.onListenerError
    })
  );

  return {
    start(): void {
      for (const listener of listeners) {
        listener.start();
      }
    },

    stop(): void {
      for (const listener of listeners) {
        listener.stop();
      }
    }
  };
}

/**
 * Convenience factory for the configured ProofPay escrow contract. The caller
 * still provides durable idempotency and projection adapters at composition time.
 */
export async function createProofPayEscrowIndexer(
  dependencies: EventRouterDependencies & {
    readonly onListenerError?: BlockchainEventIndexerDependencies["onListenerError"];
  }
): Promise<BlockchainEventIndexer> {
  const network = await blockchainEventProvider.getNetwork();
  const contracts: readonly IndexerContractDefinition[] = [
    {
      contract: proofPayEscrowEventContract,
      chainId: network.chainId.toString()
    }
  ];

  return createBlockchainEventIndexer({ ...dependencies, contracts });
}
