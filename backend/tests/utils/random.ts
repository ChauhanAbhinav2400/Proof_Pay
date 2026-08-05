import { randomBytes, randomUUID } from "crypto";

export function randomEmail(): string {
  return `test-${randomUUID()}@proofpay.test`;
}

export function randomWallet(): string {
  return `0x${randomBytes(20).toString("hex")}`;
}

export function randomTransactionHash(): string {
  return `0x${randomBytes(32).toString("hex")}`;
}
