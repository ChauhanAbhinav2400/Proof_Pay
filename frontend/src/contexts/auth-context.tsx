import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY, UNAUTHORIZED_EVENT } from "../constants/storage";
import { useCurrentUser } from "../hooks/use-current-user";
import { useLogin } from "../hooks/use-login";
import { useLogout } from "../hooks/use-logout";
import { disconnectSocket } from "../services/socket.service";
import type { AuthenticatedUser } from "../types/domain";
import { readJwtPayload } from "../utils/jwt";
import { readJson, writeJson } from "../utils/storage";
import { useWallet } from "../hooks/use-wallet";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  wallet: string | undefined;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const { walletAddress: wallet, isConnected, isWrongNetwork, disconnect, signMessage } = useWallet();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthenticatedUser | null>(() => readJson(AUTH_USER_STORAGE_KEY));
  const jwtPayload = token ? readJwtPayload(token) : null;
  const currentUser = useCurrentUser(jwtPayload?.userId, Boolean(token && jwtPayload));
  const loginMutation = useLogin();
  const attemptedWallet = useRef<string | null>(null);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    disconnectSocket();
    setToken(null);
    setUser(null);
    attemptedWallet.current = null;
    disconnect();
  }, [disconnect]);

  const logoutMutation = useLogout(clearSession);
  const logout = useCallback(() => { logoutMutation.mutate(); }, [logoutMutation]);

  const login = useCallback(async () => {
    if (!wallet || !isConnected || isWrongNetwork) return;
    const result = await loginMutation.mutateAsync({ walletAddress: wallet, signMessage });
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);
    writeJson(AUTH_USER_STORAGE_KEY, result.user);
    queryClient.setQueryData(["current-user", result.user.id], result.user);
    await queryClient.invalidateQueries({ queryKey: ["current-user", result.user.id] });
    setToken(result.token);
    setUser(result.user);
  }, [isConnected, isWrongNetwork, loginMutation, queryClient, signMessage, wallet]);

  const refreshUser = useCallback(async () => { await currentUser.refetch(); }, [currentUser]);

  useEffect(() => {
    if (!token) return;
    if (!jwtPayload) { logout(); return; }
    if (jwtPayload.exp && jwtPayload.exp * 1000 <= Date.now()) { logout(); }
  }, [jwtPayload, logout, token]);

  useEffect(() => {
    if (currentUser.data) { setUser(currentUser.data); writeJson(AUTH_USER_STORAGE_KEY, currentUser.data); }
  }, [currentUser.data]);

  useEffect(() => {
    if (currentUser.isError && token) toast.error("Unable to refresh your session.");
  }, [currentUser.isError, token]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!isConnected || isWrongNetwork || !wallet || token || attemptedWallet.current === wallet) return;
    attemptedWallet.current = wallet;
    void login().catch((error: unknown) => { attemptedWallet.current = null; toast.error(error instanceof Error ? error.message : "Wallet authentication failed."); });
  }, [isConnected, isWrongNetwork, login, token, wallet]);

  const value = useMemo(() => ({ user, wallet, token, isAuthenticated: Boolean(token && user), isLoading: loginMutation.isPending || (Boolean(token) && currentUser.isLoading), login, logout, refreshUser }), [currentUser.isLoading, login, loginMutation.isPending, logout, refreshUser, token, user, wallet]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
