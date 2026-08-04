import fs from "fs";
import path from "path";
import {
  Contract,
  InterfaceAbi,
  JsonRpcProvider,
  Wallet,
  isAddress,
} from "ethers";

import { env } from "./env";

interface DeploymentMetadata {
  chainId: number;
  MockUSDT: string;
  ProofPayEscrow: string;
}

type ContractName = "MockUSDT" | "ProofPayEscrow";

const deployment = loadDeployment(env.DEPLOYMENT_FILE, env.CHAIN_ID);
const mockUSDTAbi = loadAbi("MockUSDT");
const proofPayEscrowAbi = loadAbi("ProofPayEscrow");

export const provider = new JsonRpcProvider(env.RPC_URL);
export const wallet = createWallet(env.PRIVATE_KEY, provider);

export const mockUSDTContract = new Contract(
  deployment.MockUSDT,
  mockUSDTAbi,
  wallet,
);

export const proofPayEscrowContract = new Contract(
  deployment.ProofPayEscrow,
  proofPayEscrowAbi,
  wallet,
);

export const blockchain = {
  provider,
  wallet,
  mockUSDTContract,
  proofPayEscrowContract,
} as const;

/** Refuses startup when the configured RPC endpoint is on a different chain. */
export async function validateBlockchainNetwork(): Promise<void> {
  let connectedChainId: bigint;

  try {
    const network = await provider.getNetwork();
    connectedChainId = network.chainId;
  } catch (error) {
    throw new Error("Failed to read the connected RPC network.", { cause: error });
  }

  const expectedChainId = BigInt(env.CHAIN_ID);

  if (connectedChainId !== expectedChainId) {
    throw new Error(
      `Connected RPC chain: ${connectedChainId.toString()}\nExpected chain: ${env.CHAIN_ID}`
    );
  }
}

function createWallet(
  value: string,
  connectedProvider: JsonRpcProvider,
): Wallet {
  try {
    return new Wallet(value, connectedProvider);
  } catch {
    throw new Error("Invalid PRIVATE_KEY environment variable.");
  }
}

function loadDeployment(
  deploymentFile: string,
  selectedChainId: number
): DeploymentMetadata {
  const deploymentPath = path.resolve(process.cwd(), deploymentFile);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const metadata = readJsonFile(deploymentPath);

  if (!isDeploymentMetadata(metadata) || metadata.chainId !== selectedChainId) {
    throw new Error(`Invalid deployment metadata: ${deploymentPath}`);
  }

  return metadata;
}

function loadAbi(contractName: ContractName): InterfaceAbi {
  // Runtime ABIs are kept separate from deployment metadata and contract bytecode.
  const abiPath = path.resolve(__dirname, "../../abi", `${contractName}.json`);

  if (!fs.existsSync(abiPath)) {
    throw new Error(`ABI file not found: ${abiPath}`);
  }

  const abi = readJsonFile(abiPath);

  if (!Array.isArray(abi)) {
    throw new Error(`Invalid ABI metadata: ${abiPath}`);
  }

  return abi as InterfaceAbi;
}

function readJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch {
    throw new Error(`Invalid JSON file: ${filePath}`);
  }
}

function isDeploymentMetadata(value: unknown): value is DeploymentMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.chainId === "number" &&
    Number.isInteger(value.chainId) &&
    isAddressValue(value.MockUSDT) &&
    isAddressValue(value.ProofPayEscrow)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAddressValue(value: unknown): value is string {
  return typeof value === "string" && isAddress(value);
}
