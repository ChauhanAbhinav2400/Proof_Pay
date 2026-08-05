import { Wallet } from "ethers";
import { describe, expect, it, vi } from "vitest";

import { app } from "../../src/app";
import { NonceChallengeModel } from "../../src/models/nonce-challenge";
import { UserModel } from "../../src/models/user/user.model";
import { nonceChallengeRepository } from "../../src/repositories/nonce-challenge";
import { verifyToken } from "../../src/utils/jwt";
import { createRequest, withJson } from "../helpers";
import { randomWallet } from "../utils";

function createConfiguredWallet(): Wallet {
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Test wallet private key is not configured.");
  }

  return new Wallet(privateKey);
}

async function requestNonce(walletAddress: string): Promise<string> {
  const response = await withJson(createRequest(app).post("/auth/nonce"))
    .send({ walletAddress })
    .expect(200);

  return response.body.nonce as string;
}

describe("POST /auth/nonce", () => {
  it("creates a nonce challenge for a valid wallet address", async () => {
    const wallet = createConfiguredWallet();

    const response = await withJson(createRequest(app).post("/auth/nonce"))
      .send({ walletAddress: wallet.address })
      .expect(200);

    expect(response.body).toEqual({ nonce: expect.any(String) });
    expect(response.body.nonce).toMatch(/^[a-f0-9]{64}$/);

    const challenge = await NonceChallengeModel.findOne({
      walletAddress: wallet.address.toLowerCase()
    }).lean();

    expect(challenge).toMatchObject({
      walletAddress: wallet.address.toLowerCase(),
      nonce: response.body.nonce
    });
    expect(challenge?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("accepts checksum and lowercase representations of the same wallet", async () => {
    const wallet = createConfiguredWallet();

    await requestNonce(wallet.address);
    const lowercaseNonce = await requestNonce(wallet.address.toLowerCase());

    const challenges = await NonceChallengeModel.find({
      walletAddress: wallet.address.toLowerCase()
    }).lean();

    expect(challenges).toHaveLength(1);
    expect(challenges[0]?.nonce).toBe(lowercaseNonce);
  });

  it("rejects invalid and malformed wallet addresses", async () => {
    for (const walletAddress of ["invalid-wallet", "0x1234"]) {
      const response = await withJson(createRequest(app).post("/auth/nonce"))
        .send({ walletAddress })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid wallet address."
      });
    }
  });

  it("rejects missing or malformed request bodies", async () => {
    for (const body of [{}, []]) {
      await withJson(createRequest(app).post("/auth/nonce"))
        .send(body)
        .expect(400);
    }
  });

  it("rejects empty, non-string, and excessively long wallet values", async () => {
    for (const walletAddress of ["", null, true, 42, "a".repeat(10_000)]) {
      const response = await withJson(createRequest(app).post("/auth/nonce"))
        .send({ walletAddress })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid wallet address."
      });
    }
  });

  it("replaces an existing wallet challenge with a new nonce", async () => {
    const wallet = createConfiguredWallet();
    const firstNonce = await requestNonce(wallet.address);
    const secondNonce = await requestNonce(wallet.address);

    expect(secondNonce).not.toBe(firstNonce);

    const challenges = await NonceChallengeModel.find({
      walletAddress: wallet.address.toLowerCase()
    }).lean();

    expect(challenges).toHaveLength(1);
    expect(challenges[0]?.nonce).toBe(secondNonce);
  });

  it("returns an internal error when nonce persistence fails", async () => {
    const repositoryError = new Error("Nonce database unavailable.");
    const upsertSpy = vi
      .spyOn(nonceChallengeRepository, "upsertNonceChallenge")
      .mockRejectedValueOnce(repositoryError);

    const response = await withJson(createRequest(app).post("/auth/nonce"))
      .send({ walletAddress: createConfiguredWallet().address })
      .expect(500);

    expect(upsertSpy).toHaveBeenCalledOnce();
    expect(response.body).toMatchObject({
      success: false,
      message: "Nonce database unavailable."
    });
  });
});

describe("POST /auth/verify", () => {
  it("verifies a real wallet signature, creates a user, and returns a JWT", async () => {
    const wallet = createConfiguredWallet();
    const nonce = await requestNonce(wallet.address);
    const signature = await wallet.signMessage(nonce);

    const response = await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature })
      .expect(200);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: {
        id: expect.any(String),
        walletAddress: wallet.address.toLowerCase(),
        permissions: ["USER"]
      }
    });
    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("nonce");
    expect(verifyToken(response.body.token)).toEqual({
      userId: response.body.user.id,
      walletAddress: wallet.address.toLowerCase(),
      permissions: ["USER"]
    });

    const user = await UserModel.findOne({
      walletAddress: wallet.address.toLowerCase()
    }).lean();
    const challenge = await NonceChallengeModel.findOne({
      walletAddress: wallet.address.toLowerCase()
    }).lean();

    expect(user?._id.toString()).toBe(response.body.user.id);
    expect(challenge).toBeNull();
  });

  it("rejects invalid signatures and signatures from another wallet", async () => {
    const wallet = createConfiguredWallet();
    const nonce = await requestNonce(wallet.address);
    const otherWallet = Wallet.createRandom();

    for (const signature of ["0x", await otherWallet.signMessage(nonce)]) {
      const response = await withJson(createRequest(app).post("/auth/verify"))
        .send({ walletAddress: wallet.address, signature })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid signature."
      });
    }
  });

  it("rejects a signature for a modified nonce", async () => {
    const wallet = createConfiguredWallet();
    const nonce = await requestNonce(wallet.address);
    const signature = await wallet.signMessage(`${nonce}-modified`);

    await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature })
      .expect(401);
  });

  it("rejects missing fields and malformed verification bodies", async () => {
    const wallet = createConfiguredWallet();

    await withJson(createRequest(app).post("/auth/verify"))
      .send({ signature: "0x" })
      .expect(400);

    await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address })
      .expect(401);

    await withJson(createRequest(app).post("/auth/verify"))
      .send([])
      .expect(400);
  });

  it("rejects invalid wallet and signature value types", async () => {
    const wallet = createConfiguredWallet();
    const nonce = await requestNonce(wallet.address);
    const signature = await wallet.signMessage(nonce);

    await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: null, signature })
      .expect(400);

    await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature: null })
      .expect(401);
  });

  it("rejects expired nonce challenges", async () => {
    const wallet = createConfiguredWallet();
    const nonce = await requestNonce(wallet.address);
    const signature = await wallet.signMessage(nonce);

    await NonceChallengeModel.updateOne(
      { walletAddress: wallet.address.toLowerCase() },
      { $set: { expiresAt: new Date(Date.now() - 1_000) } }
    );

    const response = await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: "Nonce challenge not found or expired."
    });
  });

  it("prevents replaying a consumed signature", async () => {
    const wallet = createConfiguredWallet();
    const nonce = await requestNonce(wallet.address);
    const signature = await wallet.signMessage(nonce);
    const payload = { walletAddress: wallet.address, signature };

    await withJson(createRequest(app).post("/auth/verify"))
      .send(payload)
      .expect(200);

    await withJson(createRequest(app).post("/auth/verify"))
      .send(payload)
      .expect(401);
  });

  it("returns the existing user instead of creating a duplicate on later authentication", async () => {
    const wallet = createConfiguredWallet();
    const firstNonce = await requestNonce(wallet.address);
    const firstSignature = await wallet.signMessage(firstNonce);
    const firstResponse = await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature: firstSignature })
      .expect(200);

    const secondNonce = await requestNonce(wallet.address);
    const secondSignature = await wallet.signMessage(secondNonce);
    const secondResponse = await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature: secondSignature })
      .expect(200);

    expect(secondResponse.body.user.id).toBe(firstResponse.body.user.id);
    expect(
      await UserModel.countDocuments({ walletAddress: wallet.address.toLowerCase() })
    ).toBe(1);
  });

  it("does not create a user when signature verification fails", async () => {
    const wallet = createConfiguredWallet();
    await requestNonce(wallet.address);

    await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature: "0x" })
      .expect(401);

    expect(
      await UserModel.exists({ walletAddress: wallet.address.toLowerCase() })
    ).toBeNull();
  });

  it("returns an internal error when nonce lookup fails", async () => {
    const wallet = createConfiguredWallet();
    const findChallengeSpy = vi
      .spyOn(nonceChallengeRepository, "findActiveNonceChallenge")
      .mockRejectedValueOnce(new Error("Nonce database unavailable."));

    const response = await withJson(createRequest(app).post("/auth/verify"))
      .send({ walletAddress: wallet.address, signature: "0x" })
      .expect(500);

    expect(findChallengeSpy).toHaveBeenCalledOnce();
    expect(response.body).toMatchObject({
      success: false,
      message: "Nonce database unavailable."
    });
  });
});
