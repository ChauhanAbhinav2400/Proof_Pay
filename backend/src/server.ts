import { createServer } from "http";

import { env } from "./config/env";
import { validateBlockchainNetwork } from "./config/contracts";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { app } from "./app";
import { createSocketServer } from "./socket";
import { createProofPayEscrowIndexer, type BlockchainEventIndexer } from "./blockchain";
import {
  createSocketBlockchainEventPublisher,
  escrowEventProjection,
  inMemoryEventIdempotencyStore
} from "./blockchain/adapters";

async function bootstrap(): Promise<void> {
  await validateBlockchainNetwork();
  await connectDatabase();

  const server = createServer(app);
  const io = createSocketServer(server);
  let blockchainIndexer: BlockchainEventIndexer | null = null;

  server.listen(env.PORT, () => {
    console.info(`ProofPay backend listening on port ${env.PORT}`);
    void createProofPayEscrowIndexer({
      idempotencyStore: inMemoryEventIdempotencyStore,
      projections: escrowEventProjection,
      publisher: createSocketBlockchainEventPublisher(io),
      onListenerError: (error, eventName) => {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Blockchain listener failed for ${eventName}:`, message);
      },
      onProcessingError: (error, event) => {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Blockchain event processing failed for ${event.name}:`, message);
      }
    })
      .then((indexer) => {
        blockchainIndexer = indexer;
        blockchainIndexer.start();
        console.info("ProofPay blockchain event listener started.");
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to start blockchain event listener:", message);
      });
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.info(`${signal} received. Shutting down gracefully.`);
    blockchainIndexer?.stop();

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Failed to start ProofPay backend:", message);
  process.exit(1);
});
