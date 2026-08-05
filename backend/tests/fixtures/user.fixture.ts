import { buildUser } from "../factories";

export const validUserFixture = buildUser();
export const invalidUserFixture: Readonly<Record<string, unknown>> = Object.freeze({
  walletAddress: "not-a-wallet-address"
});
