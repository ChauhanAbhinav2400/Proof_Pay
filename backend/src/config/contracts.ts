import "dotenv/config";

import fs from "fs";
import path from "path";
import {
  Contract,
  InterfaceAbi,
  JsonRpcProvider,
  Wallet,
  isAddress,
} from "ethers";

interface DeploymentMetadata {
  chainId: number;
  MockUSDT: string;
  ProofPayEscrow: string;
}

type ContractName = "MockUSDT" | "ProofPayEscrow";

const DEPLOYMENT_FILES_BY_CHAIN_ID: Readonly<Record<number, string>> = {
  31337: "anvil.json",
  11155111: "sepolia.json",
};

const rpcUrl = getRequiredEnv("RPC_URL");
const privateKey = getRequiredEnv("PRIVATE_KEY");
const chainId = parseChainId(getRequiredEnv("CHAIN_ID"));

const deployment = loadDeployment(chainId);
const mockUSDTAbi = loadAbi("MockUSDT");
const proofPayEscrowAbi = loadAbi("ProofPayEscrow");

export const provider = new JsonRpcProvider(rpcUrl);
export const wallet = createWallet(privateKey, provider);

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

function getRequiredEnv(name: "RPC_URL" | "PRIVATE_KEY" | "CHAIN_ID"): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value.trim();
}

function parseChainId(value: string): number {
  const parsedChainId = Number(value);

  if (!Number.isInteger(parsedChainId) || parsedChainId <= 0) {
    throw new Error(`Invalid CHAIN_ID environment variable: ${value}`);
  }

  return parsedChainId;
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

function loadDeployment(selectedChainId: number): DeploymentMetadata {
  const deploymentFile = DEPLOYMENT_FILES_BY_CHAIN_ID[selectedChainId];

  if (!deploymentFile) {
    throw new Error(`Unsupported chain id: ${selectedChainId}`);
  }

  const deploymentPath = path.resolve(
    __dirname,
    "../../../deployments",
    deploymentFile,
  );

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
