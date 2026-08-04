import {
  Contract,
  ZeroAddress,
  type BigNumberish,
  type ContractTransactionReceipt,
  type ContractTransactionResponse,
  type Interface,
  type JsonRpcProvider,
  type TransactionReceipt,
  type Wallet
} from "ethers";

import {
  mockUSDTContract,
  proofPayEscrowContract,
  provider,
  wallet
} from "../../config/contracts";
import type {
  AcceptEscrowInput,
  ApproveMilestoneInput,
  BlockchainWriteResult,
  CancelEscrowInput,
  CreateEscrowInput,
  CreateEscrowResult,
  EscrowChainRecord,
  EscrowState,
  GetEscrowInput,
  GetEscrowStatusInput,
  GetTokenBalanceInput,
  GetNonceInput,
  RaiseDisputeInput,
  ResolveDisputeInput,
  TransactionResult,
  WaitForTransactionInput,
  WaitForTransactionResult
} from "./blockchain.types";

interface ProofPayEscrowContract {
  interface: Interface;
  createEscrow(
    freelancer: string,
    paymentToken: string,
    milestoneAmounts: BigNumberish[],
    acceptanceDeadline: BigNumberish
  ): Promise<ContractTransactionResponse>;
  acceptEscrow(
    escrowId: BigNumberish,
    deadline: BigNumberish,
    signature: string
  ): Promise<ContractTransactionResponse>;
  approveMilestone(
    escrowId: BigNumberish,
    deadline: BigNumberish,
    signature: string
  ): Promise<ContractTransactionResponse>;
  cancelEscrow(escrowId: BigNumberish): Promise<ContractTransactionResponse>;
  raiseDispute(escrowId: BigNumberish): Promise<ContractTransactionResponse>;
  resolveDispute(
    escrowId: BigNumberish,
    arbitrator: string,
    freelancerAward: BigNumberish,
    clientRefund: BigNumberish,
    deadline: BigNumberish,
    signature: string
  ): Promise<ContractTransactionResponse>;
  escrows(escrowId: BigNumberish): Promise<EscrowTuple>;
  nonces(account: string): Promise<bigint>;
}

interface Erc20Contract {
  allowance(owner: string, spender: string): Promise<bigint>;
  balanceOf(account: string): Promise<bigint>;
}

interface EscrowTuple extends ReadonlyArray<string | bigint | number> {
  readonly client: string;
  readonly freelancer: string;
  readonly paymentToken: string;
  readonly totalAmount: bigint;
  readonly acceptanceDeadline: bigint;
  readonly currentMilestone: bigint;
  readonly state: bigint;
}

const escrowContract =
  proofPayEscrowContract as unknown as ProofPayEscrowContract;

const ESCROW_STATES: readonly EscrowState[] = [
  "PendingAcceptance",
  "Active",
  "Disputed",
  "Completed",
  "Cancelled"
];

export const blockchainProvider: JsonRpcProvider = provider;
export const blockchainWallet: Wallet = wallet;
export const proofPayEscrow = proofPayEscrowContract;
export const mockUSDT = mockUSDTContract;

export function getProofPayEscrowAddress(): string {
  return getContractAddress(escrowContract);
}

export async function getCurrentBlockNumber(): Promise<number> {
  try {
    return await blockchainProvider.getBlockNumber();
  } catch (error) {
    throwBlockchainError("Contract call failed.", error);
  }
}

export async function getChainId(): Promise<string> {
  try {
    const network = await blockchainProvider.getNetwork();

    return network.chainId.toString();
  } catch (error) {
    throwBlockchainError("Contract call failed.", error);
  }
}

export async function getWalletAddress(): Promise<string> {
  try {
    return await blockchainWallet.getAddress();
  } catch (error) {
    throwBlockchainError("Contract call failed.", error);
  }
}

export async function createEscrow(
  input: CreateEscrowInput
): Promise<CreateEscrowResult> {
  try {
    await ensureCreateEscrowCanBeSent(input);
    const tx = await escrowContract.createEscrow(
      input.freelancer,
      input.paymentToken,
      input.milestoneAmounts,
      input.acceptanceDeadline
    );
    const receipt = await waitForTransactionResponse(tx);
    const result = toTransactionResult(receipt);
    const escrowId = getEscrowCreatedId(receipt);

    return escrowId ? { ...result, escrowId } : result;
  } catch (error) {
    logBlockchainError("createEscrow", error, {
      freelancer: input.freelancer,
      paymentToken: input.paymentToken,
      milestoneAmounts: input.milestoneAmounts.map((amount) => amount.toString()),
      acceptanceDeadline: input.acceptanceDeadline.toString()
    });
    throwBlockchainError("Failed to create escrow on chain.", error);
  }
}

async function ensureCreateEscrowCanBeSent(
  input: CreateEscrowInput
): Promise<void> {
  const escrowAddress = getContractAddress(escrowContract);
  const relayerAddress = await blockchainWallet.getAddress();
  const tokenCode = await blockchainProvider.getCode(input.paymentToken);
  const escrowCode = await blockchainProvider.getCode(escrowAddress);

  if (tokenCode === "0x") {
    throw new Error(
      `Payment token contract not found on configured RPC: ${input.paymentToken}.`
    );
  }

  if (escrowCode === "0x") {
    throw new Error(
      `ProofPayEscrow contract not found on configured RPC: ${escrowAddress}.`
    );
  }

  const totalAmount: bigint = input.milestoneAmounts.reduce<bigint>(
    (total, amount) => total + BigInt(amount.toString()),
    0n
  );
  const token = new Contract(
    input.paymentToken,
    [
      "function allowance(address owner,address spender) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)"
    ],
    blockchainProvider
  ) as unknown as Erc20Contract;
  const [allowance, balance] = await Promise.all([
    token.allowance(relayerAddress, escrowAddress),
    token.balanceOf(relayerAddress)
  ]);

  if (allowance < totalAmount) {
    throw new Error(
      `Relayer wallet has insufficient ERC20 allowance for escrow creation. Relayer: ${relayerAddress}. Spender: ${escrowAddress}. Required: ${totalAmount.toString()}. Allowance: ${allowance.toString()}.`
    );
  }

  if (balance < totalAmount) {
    throw new Error(
      `Relayer wallet has insufficient ERC20 balance for escrow creation. Relayer: ${relayerAddress}. Required: ${totalAmount.toString()}. Balance: ${balance.toString()}.`
    );
  }
}

export async function acceptEscrow(
  input: AcceptEscrowInput
): Promise<BlockchainWriteResult> {
  try {
    const tx = await escrowContract.acceptEscrow(
      input.escrowId,
      input.deadline,
      input.signature
    );
    const receipt = await waitForTransactionResponse(tx);

    return toTransactionResult(receipt);
  } catch (error) {
    throwBlockchainError("Failed to accept escrow on chain.", error);
  }
}

export async function approveMilestone(
  input: ApproveMilestoneInput
): Promise<BlockchainWriteResult> {
  try {
    const tx = await escrowContract.approveMilestone(
      input.escrowId,
      input.deadline,
      input.signature
    );
    const receipt = await waitForTransactionResponse(tx);

    return toTransactionResult(receipt);
  } catch (error) {
    throwBlockchainError("Failed to approve milestone on chain.", error);
  }
}

export async function cancelEscrow(
  input: CancelEscrowInput
): Promise<BlockchainWriteResult> {
  try {
    const tx = await escrowContract.cancelEscrow(input.escrowId);
    const receipt = await waitForTransactionResponse(tx);

    return toTransactionResult(receipt);
  } catch (error) {
    throwBlockchainError("Failed to cancel escrow on chain.", error);
  }
}

export async function raiseDispute(
  input: RaiseDisputeInput
): Promise<BlockchainWriteResult> {
  try {
    const tx = await escrowContract.raiseDispute(input.escrowId);
    const receipt = await waitForTransactionResponse(tx);

    return toTransactionResult(receipt);
  } catch (error) {
    throwBlockchainError("Failed to raise dispute on chain.", error);
  }
}

export async function resolveDispute(
  input: ResolveDisputeInput
): Promise<BlockchainWriteResult> {
  try {
    const tx = await escrowContract.resolveDispute(
      input.escrowId,
      input.arbitrator,
      input.freelancerAward,
      input.clientRefund,
      input.deadline,
      input.signature
    );
    const receipt = await waitForTransactionResponse(tx);

    return toTransactionResult(receipt);
  } catch (error) {
    throwBlockchainError("Failed to resolve dispute on chain.", error);
  }
}

export async function getEscrow(
  input: GetEscrowInput
): Promise<EscrowChainRecord> {
  try {
    const escrow = await escrowContract.escrows(input.escrowId);

    if (escrow.client === ZeroAddress) {
      throw new Error("Escrow not found on chain.");
    }

    return toEscrowRecord(input.escrowId, escrow);
  } catch (error) {
    if (error instanceof Error && error.message === "Escrow not found on chain.") {
      throw error;
    }

    throwBlockchainError("Contract call failed.", error);
  }
}

export async function getEscrowStatus(
  input: GetEscrowStatusInput
): Promise<EscrowState> {
  const escrow = await getEscrow({ escrowId: input.escrowId });

  return escrow.state;
}

export async function getNonce(input: GetNonceInput): Promise<string> {
  try {
    const nonce = await escrowContract.nonces(input.account);

    return nonce.toString();
  } catch (error) {
    throwBlockchainError("Contract call failed.", error);
  }
}

export async function getTokenBalance(
  input: GetTokenBalanceInput
): Promise<string> {
  try {
    const token = new Contract(
      input.tokenAddress,
      ["function balanceOf(address account) view returns (uint256)"],
      blockchainProvider
    ) as unknown as Erc20Contract;
    const balance = await token.balanceOf(input.account);

    return balance.toString();
  } catch (error) {
    throwBlockchainError("Contract call failed.", error);
  }
}

export async function waitForTransaction(
  input: WaitForTransactionInput
): Promise<WaitForTransactionResult> {
  try {
    const receipt = await blockchainProvider.waitForTransaction(
      input.transactionHash,
      1
    );
    const confirmedReceipt = ensureReceipt(receipt, input.transactionHash);

    return {
      receipt: confirmedReceipt,
      transaction: toTransactionResult(confirmedReceipt)
    };
  } catch (error) {
    throwBlockchainError("Failed to wait for transaction confirmation.", error);
  }
}

async function waitForTransactionResponse(
  tx: ContractTransactionResponse
): Promise<ContractTransactionReceipt> {
  const receipt = await tx.wait(1);

  return ensureReceipt(receipt, tx.hash);
}

function ensureReceipt<TReceipt extends ContractTransactionReceipt | TransactionReceipt>(
  receipt: TReceipt | null,
  transactionHash: string
): TReceipt {
  if (!receipt) {
    throw new Error(`Transaction receipt not found: ${transactionHash}`);
  }

  if (receipt.status === 0) {
    throw new Error("Transaction reverted.");
  }

  return receipt;
}

function toTransactionResult(
  receipt: ContractTransactionReceipt | TransactionReceipt
): TransactionResult {
  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status,
    gasUsed: receipt.gasUsed.toString()
  };
}

function toEscrowRecord(
  escrowId: BigNumberish,
  escrow: EscrowTuple
): EscrowChainRecord {
  const stateCode = Number(escrow.state);

  return {
    escrowId: escrowId.toString(),
    client: escrow.client,
    freelancer: escrow.freelancer,
    paymentToken: escrow.paymentToken,
    totalAmount: escrow.totalAmount.toString(),
    acceptanceDeadline: escrow.acceptanceDeadline.toString(),
    currentMilestone: Number(escrow.currentMilestone),
    state: ESCROW_STATES[stateCode] ?? "Cancelled",
    stateCode
  };
}

function getEscrowCreatedId(
  receipt: ContractTransactionReceipt
): string | undefined {
  for (const log of receipt.logs) {
    try {
      const parsedLog = escrowContract.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      });

      if (parsedLog?.name === "EscrowCreated") {
        const escrowId = parsedLog.args.getValue("escrowId") as bigint;

        return escrowId.toString();
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function getContractAddress(contract: ProofPayEscrowContract): string {
  const target = proofPayEscrowContract.target;

  if (typeof target !== "string") {
    throw new Error("ProofPayEscrow contract address is invalid.");
  }

  return target;
}

function throwBlockchainError(message: string, error: unknown): never {
  throw new Error(getBlockchainErrorMessage(message, error), { cause: error });
}

function getBlockchainErrorMessage(message: string, error: unknown): string {
  if (isUserRejectedError(error)) {
    return "User rejected transaction.";
  }

  if (isInsufficientFundsError(error)) {
    return "Insufficient funds.";
  }

  if (isTransactionRevertedError(error)) {
    const decodedError = decodeProofPayRevert(error);
    const detail = decodedError ?? getErrorMessage(error);

    return detail ? `Transaction reverted: ${detail}` : "Transaction reverted.";
  }

  const detail = getErrorMessage(error);

  return detail ? `${message} ${detail}` : message;
}

function decodeProofPayRevert(error: unknown): string | undefined {
  const data = findRevertData(error);

  if (!data) {
    return undefined;
  }

  try {
    const parsedError = escrowContract.interface.parseError(data);

    if (!parsedError) {
      return undefined;
    }

    return formatContractError(parsedError.name);
  } catch {
    return undefined;
  }
}

function formatContractError(errorName: string): string {
  const messages: Record<string, string> = {
    InvalidAdmin: "InvalidAdmin()",
    InvalidArbitrator: "InvalidArbitrator()",
    InvalidState: "InvalidState() - escrow is not in the required contract state.",
    InvalidSignature: "InvalidSignature() - EIP-712 signature does not match the required signer.",
    ZeroAddress: "ZeroAddress()",
    ZeroAmount: "ZeroAmount()",
    EscrowNotFound: "EscrowNotFound()",
    Unauthorized: "Unauthorized() - caller is not permitted by the Solidity contract.",
    DeadlineExpired: "DeadlineExpired()",
    InvalidFreelancer: "InvalidFreelancer()",
    EmptyMilestoneArray: "EmptyMilestoneArray()",
    InvalidAmountDistribution: "InvalidAmountDistribution()"
  };

  return messages[errorName] ?? `${errorName}()`;
}

function findRevertData(value: unknown, seen = new WeakSet<object>()): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  const data = value.data;

  if (typeof data === "string" && /^0x[0-9a-fA-F]{8,}$/.test(data)) {
    return data;
  }

  if (isRecord(data)) {
    const nestedData = findRevertData(data, seen);

    if (nestedData) {
      return nestedData;
    }
  }

  for (const nestedValue of Object.values(value)) {
    if (isRecord(nestedValue)) {
      const nestedData = findRevertData(nestedValue, seen);

      if (nestedData) {
        return nestedData;
      }
    }
  }

  return undefined;
}

function logBlockchainError(
  operation: string,
  error: unknown,
  context: Record<string, unknown>
): void {
  console.error(`[ProofPay:blockchain:${operation}]`, {
    context,
    error: serializeError(error)
  });
}

function serializeError(error: unknown): Record<string, unknown> | string {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: serializeCause(error.cause)
    };
  }

  if (isRecord(error)) {
    return {
      code: error.code,
      reason: error.reason,
      shortMessage: error.shortMessage,
      message: error.message,
      data: error.data
    };
  }

  return String(error);
}

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack
    };
  }

  return cause;
}

function isUserRejectedError(error: unknown): boolean {
  return getErrorCode(error) === "ACTION_REJECTED";
}

function isInsufficientFundsError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return message.includes("insufficient funds");
}

function isTransactionRevertedError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return message.includes("revert") || message.includes("execution reverted");
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (!isRecord(error)) {
    return "";
  }

  const shortMessage = error.shortMessage;
  const reason = error.reason;
  const message = error.message;

  if (typeof shortMessage === "string") {
    return shortMessage;
  }

  if (typeof reason === "string") {
    return reason;
  }

  return typeof message === "string" ? message : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
