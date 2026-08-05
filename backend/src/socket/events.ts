import type { AppError } from "../utils/AppError";
import type { SocketErrorPayload } from "./socket.types";

export function toSocketErrorPayload(error: unknown): SocketErrorPayload {
  if (isAppError(error)) {
    if (error.statusCode === 401) {
      return { code: "UNAUTHORIZED", message: error.message };
    }

    if (error.statusCode === 403) {
      return { code: "FORBIDDEN", message: error.message };
    }

    if (error.statusCode >= 400 && error.statusCode < 500) {
      return { code: "BAD_REQUEST", message: error.message };
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Unable to process socket event."
  };
}

function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}
