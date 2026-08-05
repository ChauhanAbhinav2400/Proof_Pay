import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "./styles/index.css";
import { App } from "./App";
import { AuthProvider } from "./contexts/auth-context";
import { WalletProvider } from "./providers/wallet-provider";
import { SocketProvider } from "./contexts/socket-context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster position="top-right" />
        </SocketProvider>
      </AuthProvider>
    </WalletProvider>
  </StrictMode>,
);
