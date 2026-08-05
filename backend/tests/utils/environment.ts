const ANVIL_DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/** Sets safe, deterministic defaults before any production module is imported. */
export function configureTestEnvironment(mongoUri: string): void {
  process.env.NODE_ENV = "test";
  process.env.PORT = "5001";
  process.env.MONGODB_URI = mongoUri;
  process.env.JWT_SECRET = "proofpay-test-jwt-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.RPC_URL = process.env.TEST_RPC_URL ?? "http://127.0.0.1:8545";
  process.env.PRIVATE_KEY = process.env.TEST_PRIVATE_KEY ?? ANVIL_DEFAULT_PRIVATE_KEY;
  process.env.CHAIN_ID = process.env.TEST_CHAIN_ID ?? "31337";
  process.env.DEPLOYMENT_FILE =
    process.env.TEST_DEPLOYMENT_FILE ?? "../deployments/anvil.json";
  process.env.ETHERSCAN_API_KEY = "";
}
