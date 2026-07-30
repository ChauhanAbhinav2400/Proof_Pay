import type {
  FilterQuery,
  ProjectionType,
  QueryOptions,
  Types,
} from "mongoose";

import { UserModel } from "../../models/user/user.model";
import type {
  CreateUserInput,
  UpdateUserPermissionsInput,
  UpdateUserProfileInput,
  UserRecord,
} from "./user.types";

const USER_PROJECTION: ProjectionType<UserRecord> = {
  walletAddress: 1,
  displayName: 1,
  email: 1,
  avatarUrl: 1,
  permissions: 1,
  createdAt: 1,
  updatedAt: 1,
};

const RETURN_UPDATED_DOCUMENT: QueryOptions = {
  new: true,
  runValidators: true,
};

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  try {
    const user = await UserModel.create(input);

    return user.toObject();
  } catch (error) {
    throwDatabaseError("Database write failed while creating user.", error);
  }
}

export async function findOrCreateByWalletAddress(
  walletAddress: string,
): Promise<UserRecord> {
  try {
    const user = await UserModel.findOneAndUpdate(
      { walletAddress },
      { $setOnInsert: { walletAddress, permissions: ["USER"] } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    )
      .select(USER_PROJECTION)
      .lean<UserRecord>()
      .exec();

    if (!user) {
      throw new Error("User record was not returned.");
    }

    return user;
  } catch (error) {
    throwDatabaseError("Database write failed while creating user.", error);
  }
}

export async function findByWalletAddress(
  walletAddress: string,
): Promise<UserRecord | null> {
  try {
    return await UserModel.findOne({ walletAddress }, USER_PROJECTION)
      .lean<UserRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database read failed while finding user by wallet.",
      error,
    );
  }
}

export async function findById(
  userId: string | Types.ObjectId,
): Promise<UserRecord | null> {
  try {
    return await UserModel.findById(userId, USER_PROJECTION)
      .lean<UserRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError("Database read failed while finding user by id.", error);
  }
}

export async function updateProfile(
  userId: string | Types.ObjectId,
  input: UpdateUserProfileInput,
): Promise<UserRecord | null> {
  try {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $set: input },
      RETURN_UPDATED_DOCUMENT,
    )
      .select(USER_PROJECTION)
      .lean<UserRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database write failed while updating user profile.",
      error,
    );
  }
}

export async function updatePermissions(
  userId: string | Types.ObjectId,
  input: UpdateUserPermissionsInput,
): Promise<UserRecord | null> {
  try {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $set: { permissions: input.permissions } },
      RETURN_UPDATED_DOCUMENT,
    )
      .select(USER_PROJECTION)
      .lean<UserRecord>()
      .exec();
  } catch (error) {
    throwDatabaseError(
      "Database write failed while updating user permissions.",
      error,
    );
  }
}

export async function existsByWallet(walletAddress: string): Promise<boolean> {
  try {
    const filter: FilterQuery<UserRecord> = { walletAddress };
    const existingUser = await UserModel.exists(filter).exec();

    return existingUser !== null;
  } catch (error) {
    throwDatabaseError(
      "Database read failed while checking user wallet existence.",
      error,
    );
  }
}

function throwDatabaseError(message: string, cause: unknown): never {
  throw new Error(message, { cause });
}
