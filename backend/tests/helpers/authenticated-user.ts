import { UserModel } from "../../src/models/user/user.model";
import type { UserPermission } from "../../src/models/user/user.types";
import { buildUser, type UserFactoryData } from "../factories";
import { createTestJwt } from "../utils";

export interface AuthenticatedTestUser {
  readonly id: string;
  readonly walletAddress: string;
  readonly token: string;
}

export async function createAuthenticatedUser(
  overrides: Partial<UserFactoryData> = {}
): Promise<AuthenticatedTestUser> {
  const user = await UserModel.create(buildUser(overrides));
  const permissions: UserPermission[] = [...user.permissions];

  return {
    id: user._id.toString(),
    walletAddress: user.walletAddress,
    token: createTestJwt({
      userId: user._id.toString(),
      walletAddress: user.walletAddress,
      permissions
    })
  };
}
