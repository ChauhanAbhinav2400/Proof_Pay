import mongoose from "mongoose";

/** Removes all test data while retaining the test database connection. */
export async function clearTestDatabase(): Promise<void> {
  const database = mongoose.connection.db;

  if (!database) {
    return;
  }

  await Promise.all(
    (await database.collections()).map((collection) => collection.deleteMany({}))
  );
}
