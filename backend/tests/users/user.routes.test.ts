import { describe, expect, it } from "vitest";

import { app } from "../../src/app";
import { UserModel } from "../../src/models/user/user.model";
import { createAuthenticatedUser, createRequest, withAuthentication, withJson } from "../helpers";

describe("User routes", () => {
  it("requires authentication for every user endpoint", async () => {
    await createRequest(app).get("/users/507f191e810c19729de860ea").expect(401);
    await withJson(createRequest(app).patch("/users/507f191e810c19729de860ea"))
      .send({ displayName: "Test" })
      .expect(401);
  });

  it("gets a user by id and wallet address and reports existence", async () => {
    const user = await createAuthenticatedUser({ displayName: "ProofPay User" });

    const byId = await withAuthentication(createRequest(app).get(`/users/${user.id}`), user.token)
      .expect(200);
    const byWallet = await withAuthentication(
      createRequest(app).get(`/users/wallets/${user.walletAddress}`),
      user.token
    ).expect(200);
    const exists = await withAuthentication(
      createRequest(app).get(`/users/wallets/${user.walletAddress}/exists`),
      user.token
    ).expect(200);

    expect(byId.body).toMatchObject({ id: user.id, walletAddress: user.walletAddress });
    expect(byWallet.body.id).toBe(user.id);
    expect(exists.body).toBe(true);
  });

  it("updates profile and permissions using the implemented request contract", async () => {
    const user = await createAuthenticatedUser();

    const profile = await withAuthentication(
      withJson(createRequest(app).patch(`/users/${user.id}`)),
      user.token
    )
      .send({ displayName: "Updated User", email: "updated@proofpay.test" })
      .expect(200);
    const permissions = await withAuthentication(
      withJson(createRequest(app).patch(`/users/${user.id}/permissions`)),
      user.token
    )
      .send({ permissions: ["USER", "ADMIN"] })
      .expect(200);

    expect(profile.body).toMatchObject({ displayName: "Updated User", email: "updated@proofpay.test" });
    expect(permissions.body.permissions).toEqual(["USER", "ADMIN"]);
    expect(await UserModel.findById(user.id).lean()).toMatchObject({
      displayName: "Updated User",
      permissions: ["USER", "ADMIN"]
    });
  });

  it("returns implemented validation and not-found errors", async () => {
    const user = await createAuthenticatedUser();

    const invalidPermissions = await withAuthentication(
      withJson(createRequest(app).patch(`/users/${user.id}/permissions`)),
      user.token
    )
      .send({ permissions: [] })
      .expect(500);
    const missing = await withAuthentication(
      createRequest(app).get("/users/507f191e810c19729de860ea"),
      user.token
    ).expect(500);

    expect(invalidPermissions.body.message).toBe("User permissions are required.");
    expect(missing.body.message).toBe("User not found.");
  });
});
