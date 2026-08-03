export const USER_PERMISSIONS = ["USER", "ADMIN", "ARBITRATOR"] as const;

export type UserPermission = (typeof USER_PERMISSIONS)[number];

export interface User {
  walletAddress: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  permissions: UserPermission[];
  createdAt: Date;
  updatedAt: Date;
}
