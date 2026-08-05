import { registerSocketEventRouter } from "./event-router";
import { joinPersonalUserRoom } from "./room-manager";
import type { ProofPaySocket, ProofPaySocketServer } from "./socket.types";

export function registerSocketConnection(
  io: ProofPaySocketServer,
  socket: ProofPaySocket
): void {
  void joinPersonalUserRoom(socket).catch(() => {
    socket.disconnect(true);
  });

  registerSocketEventRouter(io, socket);

  socket.on("disconnect", () => {
    // Socket.IO automatically removes membership; no process-local state is retained.
  });
}
