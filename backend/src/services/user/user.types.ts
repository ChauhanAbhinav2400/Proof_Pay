import type { UserRecord } from "../../repositories/user";

export type UserPermission = UserRecord["permissions"][number];

export interface UserResponse {
  id: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  permissions: UserPermission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  walletAddress: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  permissions?: UserPermission[];
}

export interface UpdateUserProfileInput {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface UpdateUserPermissionsInput {
  permissions: UserPermission[];
}
