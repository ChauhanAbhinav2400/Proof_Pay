import mongoose from "mongoose";

import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.connection.on("connected", () => {
      console.info("MongoDB connected");
    });

    mongoose.connection.on("error", (error: Error) => {
      console.error("MongoDB connection error:", error.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });

    await mongoose.connect(env.MONGODB_URI);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to connect to MongoDB:", message);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
