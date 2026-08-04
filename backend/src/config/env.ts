import dotenv from "dotenv";

dotenv.config();

const requiredEnvironmentVariables = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "RPC_URL",
  "PRIVATE_KEY",
  "DEPLOYMENT_FILE",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_S3_BUCKET_NAME"
] as const;

type RequiredEnvironmentVariable =
  (typeof requiredEnvironmentVariables)[number];

function readRequiredEnv(name: RequiredEnvironmentVariable): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: "ETHERSCAN_API_KEY" | "NODE_ENV"): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function readPositiveIntegerEnv(name: "PORT" | "CHAIN_ID"): number {
  const value = process.env[name]?.trim();
  const parsedValue = Number(value);

  if (!value || !Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }

  return parsedValue;
}

/** The sole validated source of environment configuration for the backend. */
export const env = Object.freeze({
  PORT: readPositiveIntegerEnv("PORT"),
  MONGODB_URI: readRequiredEnv("MONGODB_URI"),
  JWT_SECRET: readRequiredEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: readRequiredEnv("JWT_EXPIRES_IN"),
  RPC_URL: readRequiredEnv("RPC_URL"),
  PRIVATE_KEY: readRequiredEnv("PRIVATE_KEY"),
  CHAIN_ID: readPositiveIntegerEnv("CHAIN_ID"),
  DEPLOYMENT_FILE: readRequiredEnv("DEPLOYMENT_FILE"),
  ETHERSCAN_API_KEY: readOptionalEnv("ETHERSCAN_API_KEY"),
  AWS_ACCESS_KEY_ID: readRequiredEnv("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: readRequiredEnv("AWS_SECRET_ACCESS_KEY"),
  AWS_REGION: readRequiredEnv("AWS_REGION"),
  AWS_S3_BUCKET_NAME: readRequiredEnv("AWS_S3_BUCKET_NAME"),
  NODE_ENV: readOptionalEnv("NODE_ENV") ?? "development"
} as const);
