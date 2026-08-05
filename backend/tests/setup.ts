import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

import { teardownTestEnvironment } from "./teardown";
import { configureTestEnvironment, clearTestDatabase } from "./utils";

const mongoServer = await MongoMemoryServer.create();

// Must run before production modules import config/env.ts.
configureTestEnvironment(mongoServer.getUri());

const { connectDatabase } = await import("../src/config/database");

beforeAll(async () => {
  await connectDatabase();
});

afterEach(async () => {
  await clearTestDatabase();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await teardownTestEnvironment(mongoServer);
});
