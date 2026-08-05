import { createServer, type Server as HttpServer } from "http";
import { randomUUID } from "crypto";
import { io, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { app } from "../../src/app";
import { createSocketServer } from "../../src/socket";
import type {
  ClientToServerEvents,
  RoomPresenceEvent,
  ServerToClientEvents,
  TypingEvent
} from "../../src/socket/socket.types";
import { createAuthenticatedUser } from "../helpers";

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let baseUrl: string;
let socketServer: ReturnType<typeof createSocketServer>;
const connectedSockets: TestSocket[] = [];

beforeAll(async () => {
  httpServer = createServer(app);
  socketServer = createSocketServer(httpServer);

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  const address = httpServer.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine the Socket.IO test server address.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(() => {
  for (const socket of connectedSockets) {
    socket.disconnect();
  }

  connectedSockets.length = 0;
});

afterAll(async () => {
  await new Promise<void>((resolve) => socketServer.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe("Socket.IO integration", () => {
  it("connects an authenticated user and joins their personal room", async () => {
    const user = await createAuthenticatedUser();
    const socket = connectSocket(user.token);

    await waitForConnection(socket);

    const socketId = requireSocketId(socket);
    const serverSocket = socketServer.sockets.sockets.get(socketId);
    expect(serverSocket).toBeDefined();

    await vi.waitFor(() => {
      expect(serverSocket?.rooms.has(`user-${user.id}`)).toBe(true);
    });
  });

  it("rejects connections without an authentication token", async () => {
    const socket = connectSocket();
    const error = await waitForConnectionError(socket);

    expect(error.message).toBe("Authentication token required.");
    expect(getSocketErrorCode(error)).toBe("UNAUTHORIZED");
  });

  it("rejects connections with an invalid authentication token", async () => {
    const socket = connectSocket("not-a-jwt");
    const error = await waitForConnectionError(socket);

    expect(error.message).toBe("Invalid authentication token.");
    expect(getSocketErrorCode(error)).toBe("UNAUTHORIZED");
  });

  it("joins and leaves rooms while notifying other room members", async () => {
    const firstUser = await createAuthenticatedUser();
    const secondUser = await createAuthenticatedUser();
    const firstSocket = connectSocket(firstUser.token);
    const secondSocket = connectSocket(secondUser.token);
    const room = `project-${randomUUID()}`;

    await Promise.all([waitForConnection(firstSocket), waitForConnection(secondSocket)]);
    await joinRoom(firstSocket, room);

    const joined = onceUserJoined(firstSocket);
    await joinRoom(secondSocket, room);

    await expect(joined).resolves.toEqual({
      room,
      user: {
        userId: secondUser.id,
        walletAddress: secondUser.walletAddress,
        permissions: ["USER"]
      }
    });

    const left = onceUserLeft(firstSocket);
    await leaveRoom(secondSocket, room);

    await expect(left).resolves.toEqual({
      room,
      user: {
        userId: secondUser.id,
        walletAddress: secondUser.walletAddress,
        permissions: ["USER"]
      }
    });
  });

  it("broadcasts typing state to other members of a joined room", async () => {
    const firstUser = await createAuthenticatedUser();
    const secondUser = await createAuthenticatedUser();
    const firstSocket = connectSocket(firstUser.token);
    const secondSocket = connectSocket(secondUser.token);
    const room = `escrow-${randomUUID()}`;

    await Promise.all([waitForConnection(firstSocket), waitForConnection(secondSocket)]);
    await joinRoom(firstSocket, room);
    await joinRoom(secondSocket, room);

    const typingStarted = onceTypingStarted(secondSocket);
    firstSocket.emit("typing", { room });

    await expect(typingStarted).resolves.toEqual({
      room,
      user: {
        userId: firstUser.id,
        walletAddress: firstUser.walletAddress,
        permissions: ["USER"]
      }
    });

    const typingStopped = onceTypingStopped(secondSocket);
    firstSocket.emit("stopTyping", { room });

    await expect(typingStopped).resolves.toEqual({
      room,
      user: {
        userId: firstUser.id,
        walletAddress: firstUser.walletAddress,
        permissions: ["USER"]
      }
    });
  });

  it("accepts a message submission and acknowledges it", async () => {
    const user = await createAuthenticatedUser();
    const socket = connectSocket(user.token);

    await waitForConnection(socket);

    await sendMessage(socket, {
      room: `proposal-${randomUUID()}`,
      payload: {
        chatType: "PROPOSAL",
        referenceId: randomUUID(),
        message: "ProofPay socket verification"
      }
    });
  });

  it("removes disconnected clients from the Socket.IO server", async () => {
    const user = await createAuthenticatedUser();
    const socket = connectSocket(user.token);

    await waitForConnection(socket);
    const socketId = requireSocketId(socket);
    socket.disconnect();

    await vi.waitFor(() => {
      expect(socketServer.sockets.sockets.has(socketId)).toBe(false);
    });
  });
});

function connectSocket(token?: string): TestSocket {
  const socket = io(baseUrl, {
    auth: token ? { token } : {},
    forceNew: true,
    reconnection: false,
    transports: ["websocket"]
  });

  connectedSockets.push(socket);
  return socket;
}

function waitForConnection(socket: TestSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

function waitForConnectionError(socket: TestSocket): Promise<Error> {
  return new Promise((resolve) => {
    socket.once("connect_error", resolve);
  });
}

function onceUserJoined(socket: TestSocket): Promise<RoomPresenceEvent> {
  return new Promise((resolve) => {
    socket.once("userJoined", resolve);
  });
}

function onceUserLeft(socket: TestSocket): Promise<RoomPresenceEvent> {
  return new Promise((resolve) => {
    socket.once("userLeft", resolve);
  });
}

function onceTypingStarted(socket: TestSocket): Promise<TypingEvent> {
  return new Promise((resolve) => {
    socket.once("typingStarted", resolve);
  });
}

function onceTypingStopped(socket: TestSocket): Promise<TypingEvent> {
  return new Promise((resolve) => {
    socket.once("typingStopped", resolve);
  });
}

function expectAcknowledgement(
  emit: (acknowledge: (response: { success: boolean; error?: { message: string } }) => void) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    emit((acknowledgement) => {
      if (acknowledgement.success) {
        resolve();
        return;
      }

      reject(new Error(acknowledgement.error?.message ?? "Socket event failed."));
    });
  });
}

function joinRoom(socket: TestSocket, room: string): Promise<void> {
  return expectAcknowledgement((acknowledge) => {
    socket.emit("joinRoom", { room }, acknowledge);
  });
}

function leaveRoom(socket: TestSocket, room: string): Promise<void> {
  return expectAcknowledgement((acknowledge) => {
    socket.emit("leaveRoom", { room }, acknowledge);
  });
}

function sendMessage(
  socket: TestSocket,
  request: Parameters<ClientToServerEvents["sendMessage"]>[0]
): Promise<void> {
  return expectAcknowledgement((acknowledge) => {
    socket.emit("sendMessage", request, acknowledge);
  });
}

function requireSocketId(socket: TestSocket): string {
  if (!socket.id) {
    throw new Error("Socket connected without an identifier.");
  }

  return socket.id;
}

function getSocketErrorCode(error: Error): string | undefined {
  const data = (error as Error & { data?: unknown }).data;

  if (typeof data !== "object" || data === null || !("code" in data)) {
    return undefined;
  }

  const code = data.code;
  return typeof code === "string" ? code : undefined;
}
