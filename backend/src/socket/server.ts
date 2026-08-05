import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

import { authenticateSocket } from "./authentication";
import { registerSocketConnection } from "./connection-manager";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ProofPaySocket,
  ProofPaySocketServer,
  ServerToClientEvents,
  SocketData
} from "./socket.types";

export function createSocketServer(httpServer: HttpServer): ProofPaySocketServer {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    registerSocketConnection(io, socket as ProofPaySocket);
  });

  return io;
}
