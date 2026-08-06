# ProofPay

ProofPay is a full-stack Web3 freelancing escrow platform. It combines an off-chain marketplace experience with on-chain ERC20 escrow settlement, so clients and freelancers can discover work, negotiate proposals, chat, fund milestones, approve work, raise disputes, and resolve payments with blockchain-enforced custody.

The project is intentionally built as a production-style portfolio application: smart contracts are written with Foundry, the backend uses Express + TypeScript + MongoDB, and the frontend uses React + Vite + Wagmi + ethers v6.

## What ProofPay Does

- Clients create freelance projects.
- Freelancers submit proposals.
- Clients and freelancers can chat before escrow.
- A client accepts a proposal and funds an ERC20 escrow.
- The freelancer accepts the escrow with an EIP-712 signature.
- Milestones are submitted, approved, and paid from the escrow contract.
- Disputes can be raised and resolved by an arbitrator.
- Backend event listeners synchronize blockchain events into MongoDB.
- Socket.IO pushes realtime updates to the frontend.

## Core Architecture

ProofPay separates marketplace data from financial settlement.

```text
Frontend
  |
  | REST API / Socket.IO
  v
Express Backend
  |
  |-----------------------------|
  |                             |
  v                             v
MongoDB                     Ethereum RPC
  |                             |
  |                             v
Application Data            ProofPayEscrow / MockUSDT
  |
  v
Realtime UI Updates
```

### Off-chain

MongoDB stores application data:

- users
- projects
- proposals
- chat messages
- attachment metadata
- escrow projections for fast UI reads

### On-chain

The `ProofPayEscrow` contract owns financial truth:

- escrow creation
- ERC20 custody
- escrow acceptance
- milestone payment release
- cancellation
- dispute raising
- dispute resolution
- canonical escrow events

This keeps expensive and private marketplace data off-chain while using Solidity only where trust and funds matter.

## Current Escrow Flow

Proposal acceptance is the single entry point for escrow creation.

```text
Client accepts proposal
  ↓
Frontend checks MockUSDT allowance
  ↓
Frontend calls MockUSDT.approve() if needed
  ↓
Frontend calls ProofPayEscrow.createEscrow()
  ↓
Smart contract pulls funds into escrow
  ↓
Frontend sends escrowId + txHash to backend
  ↓
Backend verifies the on-chain escrow
  ↓
MongoDB persists escrow/proposal/project state
  ↓
Freelancer signs EIP-712 acceptance
  ↓
Backend relays acceptEscrow()
  ↓
Escrow becomes ACTIVE
```

The backend does not trust frontend claims blindly. It reads the created escrow from the contract and verifies the on-chain client, freelancer, token, and amount before committing MongoDB state.

## Tech Stack

### Smart Contracts

- Solidity
- Foundry
- OpenZeppelin Contracts
- EIP-712
- ECDSA
- SafeERC20
- AccessControl
- ReentrancyGuard

### Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- ethers v6
- JWT wallet authentication
- Socket.IO
- AWS S3
- Vitest
- Supertest
- MongoMemoryServer

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Wagmi
- ethers v6
- React Query
- React Router
- Socket.IO client
- React Hook Form
- Zod
- Framer Motion

## Repository Structure

```text
ProofPay/
├── backend/        # Express + TypeScript API, MongoDB, sockets, indexer
├── contracts/      # Foundry smart contracts and tests
├── frontend/       # React + Vite frontend
├── deployments/    # Network deployment metadata
├── docs/           # Architecture, API, DB, state machine, testing docs
├── Makefile        # Contract build/deploy/env helper commands
└── README.md
```

## Key Features

### Wallet Authentication

ProofPay uses wallet-based authentication:

```text
POST /auth/nonce
  ↓
User signs nonce with MetaMask
  ↓
POST /auth/verify
  ↓
Backend verifies signature
  ↓
Backend creates/fetches user
  ↓
JWT returned
```

Users are created only after successful wallet signature verification.

### Projects and Proposals

- Clients create projects.
- Freelancers submit proposals.
- A freelancer can only submit one proposal per project.
- Clients accept one proposal.
- Proposal acceptance triggers escrow funding.

### Chat and Attachments

- Proposal chat before escrow.
- Escrow chat after escrow creation.
- Socket.IO realtime messages.
- Typing indicators.
- AWS S3 attachment upload and signed download URLs.

### Blockchain Escrow

- Client funds escrow with MockUSDT.
- Freelancer accepts escrow via EIP-712 signature.
- Client approves milestones via EIP-712 signature.
- Disputes can be raised by client or freelancer.
- Arbitrator resolves disputes with EIP-712 settlement signature.

### Event Synchronization

The backend starts a blockchain event listener at server startup. Contract events are projected into MongoDB and broadcast to connected clients through Socket.IO.

Events handled include:

- `EscrowCreated`
- `EscrowAccepted`
- `MilestoneApproved`
- `EscrowCancelled`
- `DisputeRaised`
- `DisputeResolved`

## Prerequisites

Install:

- Node.js 20+
- npm
- MongoDB
- Foundry
- Anvil
- Make
- jq, required by `make export-abis`
- MetaMask browser extension

For Sepolia usage, you also need:

- Sepolia RPC URL
- funded Sepolia wallet
- Etherscan API key, optional for verification

## Environment Management

The backend and frontend use generated active `.env` files.

### Backend

The active backend environment is:

```text
backend/.env
```

It is generated from root-level templates such as:

```text
.env.anvil
.env.sepolia
.env.production
```

Use:

```bash
make use-anvil
make use-sepolia
make use-production
```

`DEPLOYMENT_FILE` tells the backend which deployment metadata file to read. Contract addresses should come from deployment JSON files, not hardcoded backend environment variables.

### Frontend

The frontend reads only:

```text
frontend/.env
```

Switch frontend environments with:

```bash
cd frontend
npm run use:anvil
npm run use:sepolia
```

The frontend requires:

```text
VITE_API_BASE_URL
VITE_SOCKET_URL
VITE_CHAIN_ID
VITE_RPC_URL
VITE_MOCK_USDT_ADDRESS
VITE_PROOFPAY_ESCROW_ADDRESS
```

Do not commit real private keys, RPC secrets, JWT secrets, or AWS credentials.

## Local Development: Anvil

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install

cd ../contracts
forge install
```

### 2. Start Anvil

In a separate terminal:

```bash
anvil
```

### 3. Select backend environment

From the repository root:

```bash
make use-anvil
```

### 4. Deploy contracts and export ABIs

```bash
make deploy-anvil
```

This deploys:

- `MockUSDT`
- `ProofPayEscrow`

and writes:

```text
deployments/anvil.json
backend/abi/MockUSDT.json
backend/abi/ProofPayEscrow.json
```

### 5. Select frontend environment

```bash
cd frontend
npm run use:anvil
```

Make sure the frontend `.env` contract addresses match the latest deployment metadata.

### 6. Start backend

```bash
cd backend
npm run dev
```

The backend will:

- validate environment variables
- validate RPC chain ID
- connect to MongoDB
- create the HTTP server
- attach Socket.IO
- start the blockchain event listener

### 7. Start frontend

```bash
cd frontend
npm run dev
```

Open the Vite URL in your browser and connect MetaMask to Anvil.

## Common Commands

From the repository root:

```bash
make build          # Build contracts
make test           # Run Foundry contract tests
make deploy-anvil   # Deploy contracts to local Anvil
make deploy-sepolia # Deploy contracts to Sepolia
make export-abis    # Export ABIs to backend/abi
```

Backend:

```bash
cd backend
npm run dev
npm run build
npm run typecheck
npm run test
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

Contracts:

```bash
cd contracts
forge build
forge test
```

## Testing

ProofPay includes tests across the stack.

### Smart contract tests

Foundry tests cover:

- escrow creation
- escrow acceptance
- milestone approval
- cancellation
- disputes
- dispute resolution
- fuzz tests
- invariant tests

Run:

```bash
cd contracts
forge test
```

### Backend tests

Backend tests use Vitest, Supertest, MongoMemoryServer, and Socket.IO client.

Run:

```bash
cd backend
npm run test
```

The real AWS S3 integration test is opt-in:

```bash
RUN_AWS_INTEGRATION_TESTS=true npm run test -- tests/storage/storage.integration.test.ts
```

PowerShell:

```powershell
$env:RUN_AWS_INTEGRATION_TESTS="true"
npm run test -- tests/storage/storage.integration.test.ts
```

### Frontend checks

Run:

```bash
cd frontend
npm run build
npm run lint
```

## Documentation

Detailed internal documentation lives in `docs/`:

```text
docs/
├── 01-system-architecture.md
├── 02-business-rules.md
├── 03-database-design.md
├── 04-api-design.md
├── 05-state-machines.md
├── testing.md
└── TROUBLESHOOTING.md
```

Recommended reading order:

1. `01-system-architecture.md`
2. `02-business-rules.md`
3. `05-state-machines.md`
4. `04-api-design.md`
5. `03-database-design.md`
6. `testing.md`

## Security Notes

ProofPay uses several safety patterns:

- Smart contract custody through `SafeERC20`.
- `ReentrancyGuard` on state-changing escrow functions.
- `AccessControl` for arbitrator permissions.
- EIP-712 signatures for gasless escrow actions.
- Nonces to prevent signature replay.
- Backend verification of on-chain escrow state before MongoDB persistence.
- Centralized backend environment validation.
- Contract addresses loaded from deployment metadata.

This project is still a development/portfolio implementation. Before production use, run a full smart contract audit, threat model the backend, harden authorization boundaries, and use durable event idempotency storage instead of in-memory processing.

## Contributing

Contributions are welcome.

Good first areas:

- improve test coverage
- harden backend validation
- improve frontend accessibility
- add more UI states
- improve documentation
- add deployment guides
- expand event indexer durability

Suggested workflow:

1. Fork the repository.
2. Create a feature branch.
3. Install dependencies.
4. Run relevant tests/checks.
5. Submit a pull request with a clear description.

Before opening a PR, please run:

```bash
cd contracts
forge test

cd ../backend
npm run typecheck
npm run test

cd ../frontend
npm run build
npm run lint
```

## Project Status

ProofPay currently supports the main end-to-end flow:

```text
Wallet login
  ↓
Create project
  ↓
Submit proposal
  ↓
Proposal chat
  ↓
Accept proposal
  ↓
Approve MockUSDT
  ↓
Create escrow
  ↓
Freelancer accepts escrow
  ↓
Submit milestone
  ↓
Approve milestone
  ↓
Release funds
  ↓
Dispute and arbitrator resolution
```

## License

No license file is currently included. Add a license before accepting external contributions or publishing this project for reuse.

