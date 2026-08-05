import type { Contract } from "ethers";

import { ESCROW_EVENT_NAMES } from "./event.types";
import type {
  EscrowBlockchainEvent,
  EscrowEventName,
  IndexerContractDefinition
} from "./event.types";

interface ContractLog {
  readonly transactionHash: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly index: number;
}

export interface ContractEventListener {
  start(): void;
  stop(): void;
}

export interface ContractEventListenerOptions extends IndexerContractDefinition {
  readonly onEvent: (event: EscrowBlockchainEvent) => Promise<void>;
  readonly onError?: (error: unknown, eventName: EscrowEventName) => void;
}

/**
 * Owns provider subscriptions only. Persistence and business decisions are
 * deliberately delegated after a log has been normalized.
 */
export function createContractEventListener(
  options: ContractEventListenerOptions
): ContractEventListener {
  const listeners = new Map<EscrowEventName, (...values: unknown[]) => void>();
  let started = false;

  return {
    start(): void {
      if (started) {
        return;
      }

      for (const eventName of ESCROW_EVENT_NAMES) {
        const listener = (...values: unknown[]): void => {
          void handleEvent(eventName, values, options);
        };

        listeners.set(eventName, listener);
        options.contract.on(eventName, listener);
      }

      started = true;
    },

    stop(): void {
      if (!started) {
        return;
      }

      for (const [eventName, listener] of listeners) {
        options.contract.off(eventName, listener);
      }

      listeners.clear();
      started = false;
    }
  };
}

async function handleEvent(
  eventName: EscrowEventName,
  values: readonly unknown[],
  options: ContractEventListenerOptions
): Promise<void> {
  try {
    const event = normalizeEvent(eventName, values, options);

    await options.onEvent(event);
  } catch (error) {
    // Individual log failures must not tear down the long-lived subscription.
    options.onError?.(error, eventName);
  }
}

function normalizeEvent(
  eventName: EscrowEventName,
  values: readonly unknown[],
  options: IndexerContractDefinition
): EscrowBlockchainEvent {
  const log = getLog(values.at(-1));
  const args = values.slice(0, -1);
  const metadata = {
    chainId: options.chainId,
    contractAddress: getContractAddress(options.contract),
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    blockHash: log.blockHash,
    logIndex: log.index,
    idempotencyKey: `${options.chainId}:${getContractAddress(options.contract)}:${log.transactionHash}:${log.index}`
  } as const;

  switch (eventName) {
    case "EscrowCreated":
      return {
        ...metadata,
        name: eventName,
        escrowId: toDecimalString(args[0], "escrowId"),
        client: toAddress(args[1], "client"),
        freelancer: toAddress(args[2], "freelancer"),
        paymentToken: toAddress(args[3], "paymentToken"),
        totalAmount: toDecimalString(args[4], "totalAmount")
      };
    case "EscrowAccepted":
      return {
        ...metadata,
        name: eventName,
        escrowId: toDecimalString(args[0], "escrowId"),
        freelancer: toAddress(args[1], "freelancer")
      };
    case "MilestoneApproved":
      return {
        ...metadata,
        name: eventName,
        escrowId: toDecimalString(args[0], "escrowId"),
        milestoneIndex: toSafeNumber(args[1], "milestoneIndex"),
        amount: toDecimalString(args[2], "amount")
      };
    case "DisputeRaised":
      return {
        ...metadata,
        name: eventName,
        escrowId: toDecimalString(args[0], "escrowId"),
        raisedBy: toAddress(args[1], "raisedBy")
      };
    case "DisputeResolved":
      return {
        ...metadata,
        name: eventName,
        escrowId: toDecimalString(args[0], "escrowId"),
        arbitrator: toAddress(args[1], "arbitrator"),
        freelancerAward: toDecimalString(args[2], "freelancerAward"),
        clientRefund: toDecimalString(args[3], "clientRefund")
      };
    case "EscrowCancelled":
      return {
        ...metadata,
        name: eventName,
        escrowId: toDecimalString(args[0], "escrowId"),
        cancelledBy: toAddress(args[1], "cancelledBy")
      };
  }
}

function getContractAddress(contract: Contract): string {
  if (typeof contract.target !== "string") {
    throw new Error("Unable to determine indexed contract address.");
  }

  return contract.target;
}

function getLog(value: unknown): ContractLog {
  if (!isContractLog(value)) {
    throw new Error("Received contract event without a complete log payload.");
  }

  return value.log;
}

function isContractLog(value: unknown): value is { readonly log: ContractLog } {
  if (!isRecord(value)) {
    return false;
  }

  const log = value.log;

  return isRecord(log) && isLogMetadata(log);
}

function isLogMetadata(value: unknown): value is ContractLog {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.transactionHash === "string" &&
    typeof value.blockNumber === "number" &&
    typeof value.blockHash === "string" &&
    typeof value.index === "number"
  );
}

function toAddress(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${field} value in contract event.`);
  }

  return value;
}

function toDecimalString(value: unknown, field: string): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return value.toString();
  }

  throw new Error(`Invalid ${field} value in contract event.`);
}

function toSafeNumber(value: unknown, field: string): number {
  if (typeof value === "bigint") {
    const asNumber = Number(value);

    if (Number.isSafeInteger(asNumber) && asNumber >= 0) {
      return asNumber;
    }
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }

  throw new Error(`Invalid ${field} value in contract event.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
