import { io, type Socket } from "socket.io-client";

import { environment } from "../constants/environment";
import type { ChatMessage, ChatType, SendChatMessageInput } from "../types/domain";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(environment.socketUrl, { auth: { token }, autoConnect: true });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function joinSocketRoom(room: string): void {
  socket?.emit("joinRoom", { room });
}

export function leaveSocketRoom(room: string): void {
  socket?.emit("leaveRoom", { room });
}

export function emitTyping(room: string): void {
  socket?.emit("typing", { room });
}

export function emitStopTyping(room: string): void {
  socket?.emit("stopTyping", { room });
}

export function sendSocketMessage(
  room: string,
  payload: SendChatMessageInput & { chatType: ChatType; referenceId: string },
  acknowledge?: (response: { success: boolean; error?: { message: string } }) => void
): void {
  socket?.emit("sendMessage", { room, payload }, acknowledge);
}

export function onSocketMessageCreated(handler: (event: { room: string; payload: ChatMessage }) => void): () => void {
  socket?.on("messageCreated", handler);
  return () => socket?.off("messageCreated", handler);
}

export function onSocketTypingStarted(handler: (event: { room: string }) => void): () => void {
  socket?.on("typingStarted", handler);
  return () => socket?.off("typingStarted", handler);
}

export function onSocketTypingStopped(handler: (event: { room: string }) => void): () => void {
  socket?.on("typingStopped", handler);
  return () => socket?.off("typingStopped", handler);
}

export function onSocketEscrowCreated(handler: (event: { payload: { escrowId: string } }) => void): () => void {
  socket?.on("escrowCreated", handler);
  return () => socket?.off("escrowCreated", handler);
}

export function onSocketEscrowUpdated(handler: (event: { payload: { escrowId: string } }) => void): () => void {
  socket?.on("escrowUpdated", handler);
  return () => socket?.off("escrowUpdated", handler);
}

export function onSocketEscrowCancelled(handler: (event: { payload: { escrowId: string } }) => void): () => void {
  socket?.on("escrowCancelled", handler);
  return () => socket?.off("escrowCancelled", handler);
}

export function onSocketDisputeRaised(handler: (event: { payload: { escrowId: string } }) => void): () => void {
  socket?.on("disputeRaised", handler);
  return () => socket?.off("disputeRaised", handler);
}

export function onSocketDisputeResolved(handler: (event: { payload: { escrowId: string } }) => void): () => void {
  socket?.on("disputeResolved", handler);
  return () => socket?.off("disputeResolved", handler);
}
