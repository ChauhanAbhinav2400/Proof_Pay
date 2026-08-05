import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";

import { environment } from "../constants/environment";

const wagmiConfig = createConfig({
  chains: [anvil, sepolia],
  connectors: [injected({ target: "metaMask" })],
  multiInjectedProviderDiscovery: false,
  transports: { [anvil.id]: http(environment.rpcUrl), [sepolia.id]: http(environment.rpcUrl) }
});

export function WalletProvider({ children }: PropsWithChildren): JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  return <WagmiProvider config={wagmiConfig}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></WagmiProvider>;
}
