import type { Types } from "mongoose";

import type { User, UserPermission } from "../../models/user/user.types";

export interface UserRecord extends User {
  _id: Types.ObjectId;
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
