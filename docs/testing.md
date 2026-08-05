# Testing Strategy

## Smart Contract Tests

Foundry tests cover the `ProofPayEscrow` contract and supporting mock token.

### Unit Tests

- Constructor validation and role assignment
- `createEscrow`
- `acceptEscrow`
- `approveMilestone`
- `cancelEscrow`
- `raiseDispute`
- `resolveDispute`

### Fuzz Tests

- Random milestone amounts
- Random deadlines
- Random signatures
- Random dispute distributions
- Replay protection and nonce behavior

### Invariant Tests

- Money conservation
- Milestone bounds
- Valid escrow states
- Terminal state guarantees
- Nonce monotonicity
- Protocol solvency

## Backend Tests

Backend tests use Vitest, Supertest, Socket.IO client, and MongoMemoryServer.

Current backend test coverage reflects the working frontend-driven flow:

- Wallet nonce authentication
- JWT middleware
- Users
- Projects
- Proposals
- Proposal acceptance with verified escrow persistence
- Escrow REST APIs
- Blockchain service wrapper
- Event listener/indexer/router behavior
- Socket.IO connection, rooms, typing, and chat message payloads
- Storage service integration test support

Run deterministic backend tests:

```bash
cd backend
npm run test
```

The real AWS S3 integration test is opt-in because it requires network access and valid AWS credentials:

```bash
cd backend
RUN_AWS_INTEGRATION_TESTS=true npm run test -- tests/storage/storage.integration.test.ts
```

On Windows PowerShell:

```powershell
cd backend
$env:RUN_AWS_INTEGRATION_TESTS="true"
npm run test -- tests/storage/storage.integration.test.ts
```

## Frontend Verification

Frontend verification should ensure the working user flow remains intact:

- MetaMask wallet login
- Nonce request/sign/verify
- JWT session restore
- Project creation
- Proposal submission
- Client proposal acceptance
- MockUSDT allowance check
- MockUSDT approval only when needed
- On-chain escrow creation from client wallet
- Backend proposal acceptance using `blockchainEscrowId` and `transactionHash`
- Escrow acceptance
- Milestone submission and approval
- Dispute raise and arbitrator resolution
- Chat and attachment workflows

Run frontend checks:

```bash
cd frontend
npm run build
npm run lint
```

## Static Analysis

- Slither should be run against smart contracts when contract changes are introduced.
- TypeScript checks should pass before merging backend or frontend changes.
- Tests should not require live RPC, AWS, or browser wallet access unless explicitly marked as integration/opt-in.
