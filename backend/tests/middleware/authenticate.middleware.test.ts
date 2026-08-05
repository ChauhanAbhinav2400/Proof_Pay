import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";

import { authenticate } from "../../src/middleware/authenticate";
import { UserModel } from "../../src/models/user/user.model";
import { userRepository } from "../../src/repositories/user";
import { AppError } from "../../src/utils/AppError";
import { createTestJwt, randomWallet } from "../utils";

function createRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as unknown as Request;
}

function createNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

function getNextError(next: NextFunction): unknown {
  return (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
}

describe("authenticate middleware", () => {
  it("rejects requests without an Authorization header", async () => {
    const next = createNext();

    await authenticate(createRequest(), {} as Response, next);

    expect(getNextError(next)).toBeInstanceOf(AppError);
    expect((getNextError(next) as AppError).statusCode).toBe(401);
  });

  it("rejects malformed Bearer authorization values", async () => {
    const next = createNext();

    await authenticate(createRequest("Token not-a-jwt"), {} as Response, next);

    expect(getNextError(next)).toBeInstanceOf(AppError);
    expect((getNextError(next) as AppError).message).toBe(
      "Authentication token required.",
    );
  });

  it("rejects an empty Bearer token", async () => {
    const next = createNext();

    await authenticate(createRequest("Bearer "), {} as Response, next);

    expect(getNextError(next)).toBeInstanceOf(AppError);
    expect((getNextError(next) as AppError).statusCode).toBe(401);
  });

  it("rejects invalid and expired JWTs", async () => {
    const walletAddress = randomWallet();
    const invalidNext = createNext();
    const expiredNext = createNext();
    const expiredToken = jwt.sign(
      {
        userId: "507f191e810c19729de860ea",
        walletAddress,
        permissions: ["USER"],
      },
      process.env.JWT_SECRET as string,
      { expiresIn: -1 },
    );

    await authenticate(
      createRequest("Bearer invalid-token"),
      {} as Response,
      invalidNext,
    );
    await authenticate(
      createRequest(`Bearer ${expiredToken}`),
      {} as Response,
      expiredNext,
    );

    for (const next of [invalidNext, expiredNext]) {
      expect(getNextError(next)).toBeInstanceOf(AppError);
      expect((getNextError(next) as AppError).statusCode).toBe(401);
    }
  });

  it("populates req.user and calls next for a valid JWT", async () => {
    const walletAddress = randomWallet();
    const user = await UserModel.create({
      walletAddress,
      permissions: ["USER"],
    });
    const token = createTestJwt({
      userId: user._id.toString(),
      walletAddress: user.walletAddress,
      permissions: user.permissions,
    });
    const req = createRequest(`Bearer ${token}`);
    const next = createNext();

    await authenticate(req, {} as Response, next);

    expect(getNextError(next)).toBeUndefined();
    expect(req.user).toMatchObject({
      _id: user._id,
      walletAddress: user.walletAddress,
      permissions: ["USER"],
    });
  });

  it("rejects a validly signed JWT when its user no longer exists", async () => {
    const token = createTestJwt({ walletAddress: randomWallet() });
    const next = createNext();

    await authenticate(createRequest(`Bearer ${token}`), {} as Response, next);

    expect(getNextError(next)).toBeInstanceOf(AppError);
    expect((getNextError(next) as AppError).message).toBe(
      "Invalid authentication token.",
    );
  });

  it("rejects a JWT with an invalid payload shape", async () => {
    const token = jwt.sign(
      { userId: "507f191e810c19729de860ea", walletAddress: randomWallet() },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );
    const next = createNext();

    await authenticate(createRequest(`Bearer ${token}`), {} as Response, next);

    expect(getNextError(next)).toBeInstanceOf(AppError);
    expect((getNextError(next) as AppError).message).toBe(
      "Invalid token payload",
    );
  });

  it("converts unexpected user lookup failures into an unauthorized error", async () => {
    const token = createTestJwt();
    const next = createNext();
    const lookupSpy = vi
      .spyOn(userRepository, "findById")
      .mockRejectedValueOnce(new Error("Database unavailable."));

    await authenticate(createRequest(`Bearer ${token}`), {} as Response, next);

    expect(lookupSpy).toHaveBeenCalledOnce();
    expect(getNextError(next)).toBeInstanceOf(AppError);
    expect((getNextError(next) as AppError).message).toBe(
      "Invalid authentication token.",
    );
  });
});
