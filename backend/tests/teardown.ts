import type { MongoMemoryServer } from "mongodb-memory-server";

export async function teardownTestEnvironment(
  mongoServer: MongoMemoryServer
): Promise<void> {
  const { disconnectDatabase } = await import("../src/config/database");

  await disconnectDatabase();
  await mongoServer.stop();
}
