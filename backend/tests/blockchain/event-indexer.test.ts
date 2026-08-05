import type { Contract } from "ethers";
import { describe, expect, it, vi } from "vitest";

import { routeBlockchainEvent } from "../../src/blockchain/event-router";
import { createContractEventListener } from "../../src/blockchain/listener";
import type {
  EscrowBlockchainEvent,
  EventRouterDependencies
} from "../../src/blockchain/event.types";

const event: EscrowBlockchainEvent = {
  name: "EscrowCreated",
  chainId: "31337",
  contractAddress: "0x1111111111111111111111111111111111111111",
  transactionHash: `0x${"a".repeat(64)}`,
  blockNumber: 1,
  blockHash: `0x${"b".repeat(64)}`,
  logIndex: 0,
  idempotencyKey: "31337:contract:tx:0",
  escrowId: "1",
  client: "0x2222222222222222222222222222222222222222",
  freelancer: "0x3333333333333333333333333333333333333333",
  paymentToken: "0x4444444444444444444444444444444444444444",
  totalAmount: "100"
};

function dependencies(): EventRouterDependencies & {
  readonly calls: Record<string, ReturnType<typeof vi.fn>>;
} {
  const calls = {
    acquire: vi.fn().mockResolvedValue(true),
    complete: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
    created: vi.fn().mockResolvedValue(undefined),
    accepted: vi.fn().mockResolvedValue(undefined),
    milestone: vi.fn().mockResolvedValue(undefined),
    raised: vi.fn().mockResolvedValue(undefined),
    resolved: vi.fn().mockResolvedValue(undefined),
    cancelled: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    error: vi.fn()
  };

  return {
    calls,
    idempotencyStore: {
      acquire: calls.acquire,
      complete: calls.complete,
      release: calls.release
    },
    projections: {
      applyEscrowCreated: calls.created,
      applyEscrowAccepted: calls.accepted,
      applyMilestoneApproved: calls.milestone,
      applyDisputeRaised: calls.raised,
      applyDisputeResolved: calls.resolved,
      applyEscrowCancelled: calls.cancelled
    },
    publisher: { publish: calls.publish },
    onProcessingError: calls.error
  };
}

describe("blockchain event routing", () => {
  it("projects and publishes a new event, then records completion", async () => {
    const context = dependencies();

    await routeBlockchainEvent(event, context);

    expect(context.calls.acquire).toHaveBeenCalledWith(event);
    expect(context.calls.created).toHaveBeenCalledWith(event);
    expect(context.calls.publish).toHaveBeenCalledWith(event);
    expect(context.calls.complete).toHaveBeenCalledWith(event.idempotencyKey);
    expect(context.calls.release).not.toHaveBeenCalled();
  });

  it("does not synchronize or publish duplicate deliveries", async () => {
    const context = dependencies();
    context.calls.acquire.mockResolvedValueOnce(false);

    await routeBlockchainEvent(event, context);

    expect(context.calls.created).not.toHaveBeenCalled();
    expect(context.calls.publish).not.toHaveBeenCalled();
    expect(context.calls.complete).not.toHaveBeenCalled();
  });

  it("releases the idempotency claim and reports projection failures", async () => {
    const context = dependencies();
    const failure = new Error("Projection database unavailable.");
    context.calls.created.mockRejectedValueOnce(failure);

    await routeBlockchainEvent(event, context);

    expect(context.calls.release).toHaveBeenCalledWith(event.idempotencyKey);
    expect(context.calls.error).toHaveBeenCalledWith(failure, event);
    expect(context.calls.complete).not.toHaveBeenCalled();
  });
});

describe("contract event listener", () => {
  it("normalizes an emitted contract log and forwards it without persistence coupling", async () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const contract = {
      target: event.contractAddress,
      on: vi.fn((name: string, listener: (...args: unknown[]) => void) => {
        listeners.set(name, listener);
      }),
      off: vi.fn((name: string) => listeners.delete(name))
    } as unknown as Contract;
    const onEvent = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const listener = createContractEventListener({
      contract,
      chainId: "31337",
      onEvent,
      onError
    });

    listener.start();
    listeners.get("EscrowCreated")?.(
      1n,
      event.client,
      event.freelancer,
      event.paymentToken,
      100n,
      {
        log: {
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
          index: event.logIndex
        }
      }
    );

    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: "EscrowCreated",
      escrowId: "1",
      totalAmount: "100",
      idempotencyKey: `${event.chainId}:${event.contractAddress}:${event.transactionHash}:0`
    }));
    expect(onError).not.toHaveBeenCalled();

    listener.stop();
    expect(contract.off).toHaveBeenCalledTimes(6);
  });

  it("reports malformed log handling without stopping later subscriptions", async () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const contract = {
      target: event.contractAddress,
      on: vi.fn((name: string, listener: (...args: unknown[]) => void) => listeners.set(name, listener)),
      off: vi.fn()
    } as unknown as Contract;
    const onError = vi.fn();
    const listener = createContractEventListener({
      contract,
      chainId: "31337",
      onEvent: vi.fn().mockResolvedValue(undefined),
      onError
    });

    listener.start();
    listeners.get("EscrowAccepted")?.(1n, event.freelancer, {});

    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(listeners).toHaveLength(6);
  });
});
