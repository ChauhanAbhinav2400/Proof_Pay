import type { Server, Socket } from "socket.io";
import type { EscrowBlockchainEvent } from "../blockchain";
import type { ChatMessageResponse } from "../services/chat";

export interface AuthenticatedSocketUser {
  userId: string;
  walletAddress: string;
  permissions: string[];
}

export interface SocketData {
  user: AuthenticatedSocketUser;
}

export interface RoomRequest {
  room: string;
}

export interface MessageRequest extends RoomRequest {
  payload: Record<string, unknown>;
}

export interface TypingRequest extends RoomRequest {}

export interface RoomPresenceEvent extends RoomRequest {
  user: AuthenticatedSocketUser;
}

export interface MessageCreatedEvent extends RoomRequest {
  payload: ChatMessageResponse;
}

export interface TypingEvent extends RoomRequest {
  user: AuthenticatedSocketUser;
}

export interface EscrowRealtimeEvent {
  payload: EscrowBlockchainEvent;
}

export interface SocketErrorPayload {
  code: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_ERROR";
  message: string;
}

export interface SocketAcknowledgement {
  success: boolean;
  error?: SocketErrorPayload;
}

export interface ClientToServerEvents {
  joinRoom: (
    request: RoomRequest,
    acknowledge?: (response: SocketAcknowledgement) => void,
  ) => void;
  leaveRoom: (
    request: RoomRequest,
    acknowledge?: (response: SocketAcknowledgement) => void,
  ) => void;
  typing: (request: TypingRequest) => void;
  stopTyping: (request: TypingRequest) => void;
  sendMessage: (
    request: MessageRequest,
    acknowledge?: (response: SocketAcknowledgement) => void,
  ) => void;
}

export interface ServerToClientEvents {
  messageCreated: (event: MessageCreatedEvent) => void;
  userJoined: (event: RoomPresenceEvent) => void;
  userLeft: (event: RoomPresenceEvent) => void;
  typingStarted: (event: TypingEvent) => void;
  typingStopped: (event: TypingEvent) => void;
  escrowCreated: (event: EscrowRealtimeEvent) => void;
  escrowUpdated: (event: EscrowRealtimeEvent) => void;
  escrowCancelled: (event: EscrowRealtimeEvent) => void;
  disputeRaised: (event: EscrowRealtimeEvent) => void;
  disputeResolved: (event: EscrowRealtimeEvent) => void;
  projectCancelled: (event: { projectId: string }) => void;
  proposalAccepted: (event: { proposalId: string; projectId: string }) => void;
  error: (error: SocketErrorPayload) => void;
}

export interface InterServerEvents {}

export type ProofPaySocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type ProofPaySocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
