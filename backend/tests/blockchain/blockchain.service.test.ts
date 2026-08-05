import { ZeroAddress } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

const chainMocks = vi.hoisted(() => ({
  provider: {
    getBlockNumber: vi.fn(),
    getNetwork: vi.fn(),
    getCode: vi.fn(),
    waitForTransaction: vi.fn()
  },
  wallet: { getAddress: vi.fn() },
  erc20: {
    allowance: vi.fn(),
    balanceOf: vi.fn()
  },
  contract: {
    target: "0x4444444444444444444444444444444444444444",
    createEscrow: vi.fn(),
    acceptEscrow: vi.fn(),
    approveMilestone: vi.fn(),
    cancelEscrow: vi.fn(),
    raiseDispute: vi.fn(),
    resolveDispute: vi.fn(),
    escrows: vi.fn(),
    nonces: vi.fn(),
    interface: { parseLog: vi.fn() }
  }
}));

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();

  return {
    ...actual,
    Contract: vi.fn(function ContractMock() {
      return chainMocks.erc20;
    })
  };
});

vi.mock("../../src/config/contracts", () => ({
  provider: chainMocks.provider,
  wallet: chainMocks.wallet,
  mockUSDTContract: {},
  proofPayEscrowContract: chainMocks.contract
}));

import * as blockchainService from "../../src/services/blockchain/blockchain.service";

const transactionHash = `0x${"1".repeat(64)}`;

function receipt(logs: unknown[] = []) {
  return {
    hash: transactionHash,
    blockNumber: 100,
    status: 1,
    gasUsed: 21_000n,
    logs
  };
}

function transaction(logs: unknown[] = []) {
  return {
    hash: transactionHash,
    wait: vi.fn().mockResolvedValue(receipt(logs))
  };
}

describe("BlockchainService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reads the configured block, chain, wallet, nonce, and on-chain escrow", async () => {
    const client = "0x1111111111111111111111111111111111111111";
    chainMocks.provider.getBlockNumber.mockResolvedValue(123);
    chainMocks.provider.getNetwork.mockResolvedValue({ chainId: 31337n });
    chainMocks.wallet.getAddress.mockResolvedValue(client);
    chainMocks.contract.nonces.mockResolvedValue(7n);
    chainMocks.contract.escrows.mockResolvedValue({
      client,
      freelancer: "0x2222222222222222222222222222222222222222",
      paymentToken: "0x3333333333333333333333333333333333333333",
      totalAmount: 500n,
      acceptanceDeadline: 999n,
      currentMilestone: 1n,
      state: 1n
    });

    await expect(blockchainService.getCurrentBlockNumber()).resolves.toBe(123);
    await expect(blockchainService.getChainId()).resolves.toBe("31337");
    await expect(blockchainService.getWalletAddress()).resolves.toBe(client);
    await expect(blockchainService.getNonce({ account: client })).resolves.toBe("7");
    await expect(blockchainService.getEscrow({ escrowId: "4" })).resolves.toMatchObject({
      escrowId: "4",
      totalAmount: "500",
      currentMilestone: 1,
      state: "Active"
    });
  });

  it("rejects reads for an on-chain escrow that does not exist", async () => {
    chainMocks.contract.escrows.mockResolvedValue({ client: ZeroAddress });

    await expect(blockchainService.getEscrow({ escrowId: "999" })).rejects.toThrow(
      "Escrow not found on chain."
    );
  });

  it("creates an escrow, confirms its transaction, and reads EscrowCreated", async () => {
    const tx = transaction([{ topics: [], data: "0x" }]);
    chainMocks.wallet.getAddress.mockResolvedValue("0x5555555555555555555555555555555555555555");
    chainMocks.provider.getCode.mockResolvedValue("0x6000");
    chainMocks.erc20.allowance.mockResolvedValue(50n);
    chainMocks.erc20.balanceOf.mockResolvedValue(50n);
    chainMocks.contract.createEscrow.mockResolvedValue(tx);
    chainMocks.contract.interface.parseLog.mockReturnValue({
      name: "EscrowCreated",
      args: { getValue: () => 42n }
    });

    const result = await blockchainService.createEscrow({
      freelancer: "0x2222222222222222222222222222222222222222",
      paymentToken: "0x3333333333333333333333333333333333333333",
      milestoneAmounts: [20n, 30n],
      acceptanceDeadline: "999"
    });

    expect(chainMocks.contract.createEscrow).toHaveBeenCalledWith(
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
      [20n, 30n],
      "999"
    );
    expect(result).toEqual({
      transactionHash,
      blockNumber: 100,
      status: 1,
      gasUsed: "21000",
      escrowId: "42"
    });
  });

  it("executes every signature and state-transition write through the configured contract", async () => {
    chainMocks.contract.acceptEscrow.mockResolvedValue(transaction());
    chainMocks.contract.approveMilestone.mockResolvedValue(transaction());
    chainMocks.contract.raiseDispute.mockResolvedValue(transaction());
    chainMocks.contract.cancelEscrow.mockResolvedValue(transaction());
    chainMocks.contract.resolveDispute.mockResolvedValue(transaction());

    await blockchainService.acceptEscrow({ escrowId: "1", deadline: "9", signature: "0xsig" });
    await blockchainService.approveMilestone({ escrowId: "1", deadline: "9", signature: "0xsig" });
    await blockchainService.raiseDispute({ escrowId: "1" });
    await blockchainService.cancelEscrow({ escrowId: "1" });
    await blockchainService.resolveDispute({
      escrowId: "1",
      arbitrator: "0x1111111111111111111111111111111111111111",
      freelancerAward: "30",
      clientRefund: "70",
      deadline: "9",
      signature: "0xsig"
    });

    expect(chainMocks.contract.acceptEscrow).toHaveBeenCalledWith("1", "9", "0xsig");
    expect(chainMocks.contract.approveMilestone).toHaveBeenCalledWith("1", "9", "0xsig");
    expect(chainMocks.contract.raiseDispute).toHaveBeenCalledWith("1");
    expect(chainMocks.contract.cancelEscrow).toHaveBeenCalledWith("1");
    expect(chainMocks.contract.resolveDispute).toHaveBeenCalledWith(
      "1",
      "0x1111111111111111111111111111111111111111",
      "30",
      "70",
      "9",
      "0xsig"
    );
  });

  it("rejects reverted or absent transaction receipts", async () => {
    chainMocks.contract.cancelEscrow.mockResolvedValue({
      hash: transactionHash,
      wait: vi.fn().mockResolvedValue({ ...receipt(), status: 0 })
    });
    await expect(blockchainService.cancelEscrow({ escrowId: "1" })).rejects.toThrow(
      "Transaction reverted."
    );

    chainMocks.provider.waitForTransaction.mockResolvedValue(null);
    await expect(blockchainService.waitForTransaction({ transactionHash })).rejects.toThrow(
      "Failed to wait for transaction confirmation."
    );
  });
});
