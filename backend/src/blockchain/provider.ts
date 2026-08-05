import { provider } from "../config/contracts";

// Reuse the application's configured provider; indexers must not create a second connection.
export const blockchainEventProvider = provider;
