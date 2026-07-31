import { userRepository } from "../../repositories/user";
import type {
  CreateUserInput as CreateUserRepositoryInput,
  UserRecord
} from "../../repositories/user";
import type {
  CreateUserInput,
  UpdateUserPermissionsInput,
  UpdateUserProfileInput,
  UserResponse
} from "./user.types";

const DEFAULT_USER_PERMISSIONS = ["USER"] as const;
const VALID_USER_PERMISSIONS = new Set(["USER", "ADMIN"]);

export async function createUser(input: CreateUserInput): Promise<UserResponse> {
  const walletAddress = requireWalletAddress(input.walletAddress);

  if (await userRepository.existsByWallet(walletAddress)) {
    throw new Error("Wallet already registered.");
  }

  const permissions = input.permissions ?? [...DEFAULT_USER_PERMISSIONS];
  validatePermissions(permissions);

  const createInput: CreateUserRepositoryInput = {
    walletAddress,
    permissions
  };

  if (input.displayName !== undefined) {
    createInput.displayName = requireText(
      input.displayName,
      "Display name cannot be empty."
    );
  }

  const email = normalizeOptionalText(input.email);
  const avatarUrl = normalizeOptionalText(input.avatarUrl);

  if (email !== undefined) {
    createInput.email = email;
  }

  if (avatarUrl !== undefined) {
    createInput.avatarUrl = avatarUrl;
  }

  const user = await userRepository.createUser(createInput);

  return toUserResponse(user);
}

export async function getUserByWallet(
  walletAddress: string
): Promise<UserResponse> {
  const normalizedWallet = requireWalletAddress(walletAddress);

  const user = await userRepository.findByWalletAddress(normalizedWallet);

  if (!user) {
    throw new Error("User not found.");
  }

  return toUserResponse(user);
}

export async function getUserById(userId: string): Promise<UserResponse> {
  const normalizedUserId = requireText(userId, "User id is required.");
  const user = await userRepository.findById(normalizedUserId);

  if (!user) {
    throw new Error("User not found.");
  }

  return toUserResponse(user);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<UserResponse> {
  const normalizedUserId = requireText(userId, "User id is required.");
  const update = compactProfileUpdate(input);

  if (Object.keys(update).length === 0) {
    throw new Error("Invalid profile update.");
  }

  const user = await userRepository.updateProfile(normalizedUserId, update);

  if (!user) {
    throw new Error("User not found.");
  }

  return toUserResponse(user);
}

export async function updateUserPermissions(
  userId: string,
  input: UpdateUserPermissionsInput
): Promise<UserResponse> {
  const normalizedUserId = requireText(userId, "User id is required.");

  if (input.permissions.length === 0) {
    throw new Error("User permissions are required.");
  }

  validatePermissions(input.permissions);

  const user = await userRepository.updatePermissions(normalizedUserId, {
    permissions: input.permissions
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return toUserResponse(user);
}

export async function userExists(walletAddress: string): Promise<boolean> {
  const normalizedWallet = requireWalletAddress(walletAddress);

  return userRepository.existsByWallet(normalizedWallet);
}

function compactProfileUpdate(
  input: UpdateUserProfileInput
): UpdateUserProfileInput {
  const update: UpdateUserProfileInput = {};
  const displayName = normalizeOptionalText(input.displayName);
  const email = normalizeOptionalText(input.email);
  const avatarUrl = normalizeOptionalText(input.avatarUrl);

  if (displayName !== undefined) {
    update.displayName = displayName;
  }

  if (email !== undefined) {
    update.email = email;
  }

  if (avatarUrl !== undefined) {
    update.avatarUrl = avatarUrl;
  }

  return update;
}

function requireText(value: string, message: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
}

function requireWalletAddress(walletAddress: string): string {
  return requireText(walletAddress, "Wallet address is required.").toLowerCase();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? undefined : normalizedValue;
}

function validatePermissions(permissions: readonly string[]): void {
  const hasInvalidPermission = permissions.some(
    (permission) => !VALID_USER_PERMISSIONS.has(permission)
  );

  if (hasInvalidPermission) {
    throw new Error("Invalid user permissions.");
  }
}

function toUserResponse(user: UserRecord): UserResponse {
  return {
    id: user._id.toString(),
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    permissions: user.permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
