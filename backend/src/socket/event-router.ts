import { chatService } from "../services/chat";
import { toSocketErrorPayload } from "./events";
import {
  broadcastToRoomExceptSender,
  joinRoom,
  leaveRoom
} from "./room-manager";
import type { ProofPaySocket, ProofPaySocketServer } from "./socket.types";

export function registerSocketEventRouter(
  io: ProofPaySocketServer,
  socket: ProofPaySocket
): void {
  socket.on("joinRoom", async (request, acknowledge) => {
    try {
      await chatService.joinRoom(request);
      await joinRoom(socket, request.room);
      broadcastToRoomExceptSender(io, socket, request.room, "userJoined", {
        room: request.room,
        user: socket.data.user
      });
      acknowledge?.({ success: true });
    } catch (error) {
      handleEventError(socket, error, acknowledge);
    }
  });

  socket.on("leaveRoom", async (request, acknowledge) => {
    try {
      await chatService.leaveRoom(request);
      await leaveRoom(socket, request.room);
      broadcastToRoomExceptSender(io, socket, request.room, "userLeft", {
        room: request.room,
        user: socket.data.user
      });
      acknowledge?.({ success: true });
    } catch (error) {
      handleEventError(socket, error, acknowledge);
    }
  });

  socket.on("typing", (request) => {
    broadcastToRoomExceptSender(io, socket, request.room, "typingStarted", {
      room: request.room,
      user: socket.data.user
    });
  });

  socket.on("stopTyping", (request) => {
    broadcastToRoomExceptSender(io, socket, request.room, "typingStopped", {
      room: request.room,
      user: socket.data.user
    });
  });

  socket.on("sendMessage", async (request, acknowledge) => {
    try {
      const message = await chatService.sendMessage({
        ...toMessagePayload(request.payload),
        senderWallet: socket.data.user.walletAddress
      });
      broadcastToRoomExceptSender(io, socket, request.room, "messageCreated", {
        room: request.room,
        payload: message
      });
      acknowledge?.({ success: true });
    } catch (error) {
      handleEventError(socket, error, acknowledge);
    }
  });
}

function toMessagePayload(payload: Record<string, unknown>): Parameters<typeof chatService.sendMessage>[0] {
  const { attachments, chatType, message, referenceId } = payload;

  if ((chatType !== "PROPOSAL" && chatType !== "ESCROW") || typeof referenceId !== "string" || typeof message !== "string") {
    throw new Error("Invalid message payload.");
  }

  return {
    chatType,
    referenceId,
    message,
    attachments: Array.isArray(attachments) ? attachments : undefined,
    senderWallet: ""
  };
}

function handleEventError(
  socket: ProofPaySocket,
  error: unknown,
  acknowledge?: (response: { success: boolean; error?: ReturnType<typeof toSocketErrorPayload> }) => void
): void {
  const payload = toSocketErrorPayload(error);

  socket.emit("error", payload);
  acknowledge?.({ success: false, error: payload });
}
