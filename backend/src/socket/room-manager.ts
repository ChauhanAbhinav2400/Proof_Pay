import type {
  ProofPaySocket,
  ProofPaySocketServer,
  ServerToClientEvents
} from "./socket.types";

export function getUserRoomName(userId: string): string {
  return `user-${userId}`;
}

export function getProjectRoomName(projectId: string): string {
  return `project-${projectId}`;
}

export function getEscrowRoomName(blockchainEscrowId: string): string {
  return `escrow-${blockchainEscrowId}`;
}

export async function joinRoom(
  socket: ProofPaySocket,
  room: string
): Promise<void> {
  await socket.join(room);
}

export async function leaveRoom(
  socket: ProofPaySocket,
  room: string
): Promise<void> {
  await socket.leave(room);
}

export async function joinPersonalUserRoom(
  socket: ProofPaySocket
): Promise<void> {
  await joinRoom(socket, getUserRoomName(socket.data.user.userId));
}

export function broadcastToRoom<EventName extends keyof ServerToClientEvents>(
  io: ProofPaySocketServer,
  room: string,
  eventName: EventName,
  ...args: Parameters<ServerToClientEvents[EventName]>
): void {
  io.to(room).emit(eventName, ...args);
}

export function broadcastToRoomExceptSender<
  EventName extends keyof ServerToClientEvents
>(
  io: ProofPaySocketServer,
  socket: ProofPaySocket,
  room: string,
  eventName: EventName,
  ...args: Parameters<ServerToClientEvents[EventName]>
): void {
  io.except(socket.id).to(room).emit(eventName, ...args);
}
