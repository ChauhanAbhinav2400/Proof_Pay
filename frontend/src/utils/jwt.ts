import type { JwtPayload } from "../types/domain";

export function readJwtPayload(token: string): JwtPayload | null {
  const [, encodedPayload] = token.split(".");
  if (!encodedPayload) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;
    return isJwtPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(Array.from(atob(normalized)).map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.userId === "string" && typeof payload.walletAddress === "string" && Array.isArray(payload.permissions) && payload.permissions.every((permission) => permission === "USER" || permission === "ADMIN" || permission === "ARBITRATOR");
}
