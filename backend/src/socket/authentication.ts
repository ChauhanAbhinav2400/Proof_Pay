import type { ExtendedError } from "socket.io";

import { authService } from "../services/auth";
import type { ProofPaySocket, SocketErrorPayload } from "./socket.types";

export function authenticateSocket(
  socket: ProofPaySocket,
  next: (error?: ExtendedError) => void
): void {
  const token = extractHandshakeToken(socket);

  if (!token) {
    next(createHandshakeError({
      code: "UNAUTHORIZED",
      message: "Authentication token required."
    }));
    return;
  }

  try {
    const payload = authService.verifyAccessToken(token);

    socket.data.user = {
      userId: payload.userId,
      walletAddress: payload.walletAddress,
      permissions: payload.permissions
    };
    next();
  } catch {
    next(createHandshakeError({
      code: "UNAUTHORIZED",
      message: "Invalid authentication token."
    }));
  }
}

function extractHandshakeToken(socket: ProofPaySocket): string | undefined {
  const authToken = socket.handshake.auth.token;

  if (typeof authToken === "string" && authToken.trim() !== "") {
    return authToken;
  }

  const authorization = socket.handshake.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token || undefined;
}

function createHandshakeError(payload: SocketErrorPayload): ExtendedError {
  return Object.assign(new Error(payload.message), { data: payload });
}
