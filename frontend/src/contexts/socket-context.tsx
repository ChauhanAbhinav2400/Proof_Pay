import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { escrowKeys } from "../features/escrow/hooks/use-escrows";
import { projectKeys } from "../features/projects/hooks/use-projects";
import { proposalKeys } from "../features/proposals/hooks/use-proposals";
import {
  connectSocket,
  disconnectSocket,
  onSocketDisputeRaised,
  onSocketDisputeResolved,
  onSocketEscrowCancelled,
  onSocketEscrowCreated,
  onSocketEscrowUpdated
} from "../services/socket.service";

interface SocketContextValue { isConnected: boolean; }
const SocketContext = createContext<SocketContextValue>({ isConnected: false });

export function SocketProvider({ children }: PropsWithChildren): JSX.Element {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  useEffect(() => {
    if (!token) { disconnectSocket(); setIsConnected(false); return; }
    const socket = connectSocket(token);
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => { socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); disconnectSocket(); };
  }, [token]);

  useEffect(() => {
    if (!isConnected) return;

    const refreshEscrows = (event: { payload: { escrowId: string } }) => {
      void queryClient.invalidateQueries({ queryKey: escrowKeys.all });
      void queryClient.invalidateQueries({ queryKey: escrowKeys.detail(event.payload.escrowId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: proposalKeys.all });
    };
    const unsubscribers = [
      onSocketEscrowCreated(refreshEscrows),
      onSocketEscrowUpdated(refreshEscrows),
      onSocketEscrowCancelled(refreshEscrows),
      onSocketDisputeRaised(refreshEscrows),
      onSocketDisputeResolved(refreshEscrows)
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [isConnected, queryClient]);
  const value = useMemo(() => ({ isConnected }), [isConnected]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue { return useContext(SocketContext); }
