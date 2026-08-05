import { access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const supportedEnvironments = new Set(["anvil", "sepolia"]);
const requestedEnvironment = process.argv[2] ?? "ensure";
const projectRoot = process.cwd();
const activeEnvironmentPath = path.join(projectRoot, ".env");

async function main(): Promise<void> {
  if (requestedEnvironment === "ensure") {
    if (await fileExists(activeEnvironmentPath)) {
      return;
    }

    await useEnvironment("anvil");
    return;
  }

  if (!supportedEnvironments.has(requestedEnvironment)) {
    throw new Error(`Unsupported environment "${requestedEnvironment}". Use "anvil" or "sepolia".`);
  }

  await useEnvironment(requestedEnvironment);
}

async function useEnvironment(environment: string): Promise<void> {
  const templatePath = path.join(projectRoot, `.env.${environment}`);

  if (!(await fileExists(templatePath))) {
    throw new Error(`Environment template not found: ${templatePath}`);
  }

  await copyFile(templatePath, activeEnvironmentPath);
  console.log(`ProofPay frontend environment is now: ${environment}`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to select the frontend environment.");
  process.exitCode = 1;
});
