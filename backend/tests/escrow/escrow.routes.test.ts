import { describe, expect, it, vi } from "vitest";

const blockchainMocks = vi.hoisted(() => ({
  getEscrow: vi.fn(),
}));

vi.mock("../../src/services/blockchain", () => ({
  blockchainService: {
    getEscrow: blockchainMocks.getEscrow,
  },
}));

import { app } from "../../src/app";
import { EscrowModel } from "../../src/models/escrow/escrow.model";
import { buildEscrow } from "../factories";
import {
  createAuthenticatedUser,
  createRequest,
  withAuthentication,
} from "../helpers";

describe("Escrow read routes", () => {
  it("requires authentication for all mounted escrow routes", async () => {
    await createRequest(app).get("/escrow").expect(401);
    await createRequest(app).get("/escrow/1").expect(401);
    await createRequest(app).get("/escrow/1/exists").expect(401);
  });

  it("lists the authenticated freelancer's persisted escrows", async () => {
    const freelancer = await createAuthenticatedUser();
    await EscrowModel.create([
      buildEscrow({
        blockchainEscrowId: "1",
        freelancerWallet: freelancer.walletAddress,
      }),
      buildEscrow({
        blockchainEscrowId: "2",
        freelancerWallet: (await createAuthenticatedUser()).walletAddress,
      }),
    ]);

    const response = await withAuthentication(
      createRequest(app).get("/escrow"),
      freelancer.token,
    ).expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      blockchainEscrowId: "1",
      freelancerWallet: freelancer.walletAddress,
    });
  });

  it("gets a persisted escrow by blockchain id and exposes existence", async () => {
    const freelancer = await createAuthenticatedUser();
    const escrow = await EscrowModel.create(
      buildEscrow({
        blockchainEscrowId: "123",
        freelancerWallet: freelancer.walletAddress,
      }),
    );
    blockchainMocks.getEscrow.mockResolvedValue({
      escrowId: "123",
      client: escrow.clientWallet,
      freelancer: escrow.freelancerWallet,
      paymentToken: escrow.tokenAddress,
      totalAmount: escrow.totalAmount,
      acceptanceDeadline: "9999999999",
      currentMilestone: 0,
      state: "Active",
      stateCode: 1,
    });

    const response = await withAuthentication(
      createRequest(app).get("/escrow/123"),
      freelancer.token,
    ).expect(200);
    const exists = await withAuthentication(
      createRequest(app).get("/escrow/123/exists"),
      freelancer.token,
    ).expect(200);

    expect(response.body).toMatchObject({
      id: escrow.id,
      blockchainEscrowId: "123",
    });
    expect(exists.body).toBe(true);
  });

  it("returns the implemented not-found response for absent escrows", async () => {
    const freelancer = await createAuthenticatedUser();

    const response = await withAuthentication(
      createRequest(app).get("/escrow/missing"),
      freelancer.token,
    ).expect(500);

    expect(response.body).toMatchObject({
      success: false,
      message: "Escrow not found.",
    });
  });
});
