function readRequiredEnvironmentVariable(name: string): string {
  const value = import.meta.env[name];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

export const environment = Object.freeze({
  apiBaseUrl: readRequiredEnvironmentVariable("VITE_API_BASE_URL"),
  socketUrl: readRequiredEnvironmentVariable("VITE_SOCKET_URL"),
  chainId: Number(readRequiredEnvironmentVariable("VITE_CHAIN_ID")),
  rpcUrl: readRequiredEnvironmentVariable("VITE_RPC_URL"),
  mockUsdtAddress: readRequiredEnvironmentVariable("VITE_MOCK_USDT_ADDRESS"),
  proofPayEscrowAddress: readRequiredEnvironmentVariable("VITE_PROOFPAY_ESCROW_ADDRESS"),
});
