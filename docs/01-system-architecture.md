# ProofPay System Architecture

## Overview

ProofPay is a Web3 freelancing platform where project discovery, proposals, negotiation, chat, and file sharing are handled off-chain, while escrow custody and settlement are enforced by the `ProofPayEscrow` smart contract.

The current production flow is frontend-led for user-wallet transactions:

1. The client accepts a proposal in the frontend.
2. The frontend checks MockUSDT allowance and submits `approve()` only if needed.
3. The frontend creates the escrow on-chain from the connected client wallet.
4. The backend verifies the existing on-chain escrow, persists the MongoDB projection, and updates proposal/project state.

This avoids a separate user-facing create-escrow workflow. Proposal acceptance is the single entry point for escrow creation.

## High-Level Component Diagram

```text
Frontend
  |
  | REST API / Socket.IO
  v
Express Backend
  |
  |------------------------------|
  |                              |
  v                              v
MongoDB                      Ethereum RPC
  |                              |
  |                              v
Application Data            ProofPayEscrow / MockUSDT
  |
  v
Socket.IO Realtime Updates
```

## Frontend Responsibilities

- Connect MetaMask through Wagmi injected connector and ethers v6.
- Request and sign wallet-login nonce challenges.
- Store JWT session state.
- Check MockUSDT allowance before escrow creation.
- Submit ERC20 `approve()` only when allowance is insufficient.
- Submit client-owned `ProofPayEscrow.createEscrow()` transactions.
- Sign EIP-712 messages for gasless contract flows where required:
  - freelancer accepts escrow;
  - client approves milestone;
  - arbitrator resolves dispute.
- Call backend APIs after wallet transactions so MongoDB projections stay synchronized.

## Backend Responsibilities

- Authenticate wallets and issue JWTs.
- Auto-create a user only after successful signature verification.
- Validate API inputs and enforce authorization rules.
- Persist users, projects, proposals, escrows, milestones, chat messages, and attachment metadata.
- Verify frontend-created escrow transactions before accepting/persisting proposal acceptance.
- Relay signature-based contract operations where the protocol uses EIP-712.
- Read contract state and transaction receipts through the shared blockchain configuration layer.
- Synchronize contract events into MongoDB for API and realtime consumers.
- Emit Socket.IO updates for chat and workflow changes.

## Blockchain Responsibilities

- Custody escrowed ERC20 funds.
- Enforce on-chain escrow state transitions.
- Verify EIP-712 signatures.
- Release milestone payments.
- Freeze active escrows when disputes are raised.
- Resolve disputes according to arbitrator-signed settlement data.
- Emit canonical events used by the backend listener and indexer.

## MongoDB Responsibilities

- Store off-chain marketplace data.
- Store backend projections of blockchain escrows.
- Store proposal and escrow chat messages.
- Preserve cancelled projects and historical workflow records.
- Enforce uniqueness where required, such as:
  - one proposal per freelancer per project;
  - one escrow projection per `blockchainEscrowId`.

## Socket.IO Responsibilities

- Provide realtime proposal chat and escrow chat delivery.
- Broadcast typing, room presence, message, and workflow events.
- Use deterministic room names:
  - `proposal-{proposalId}`
  - `escrow-{blockchainEscrowId}`
- Never act as the source of truth for authorization or persistence.

## Authentication Flow

```text
Wallet requests nonce
    |
Backend stores NonceChallenge with TTL
    |
Wallet signs nonce
    |
Backend verifies signature
    |
Backend creates user if wallet is new
    |
Backend issues JWT
    |
Authenticated REST / Socket.IO access
```

User permissions are system-level permissions: `USER`, `ADMIN`, and `ARBITRATOR`.

## Proposal Acceptance and Escrow Creation Flow

```text
Client creates project
    |
Freelancer submits proposal
    |
Client accepts proposal in frontend
    |
Frontend checks MockUSDT allowance
    |
Frontend approves ProofPayEscrow if needed
    |
Frontend calls ProofPayEscrow.createEscrow()
    |
Frontend sends proposal acceptance payload
with blockchainEscrowId + transactionHash
    |
Backend verifies on-chain escrow data
    |
Backend atomically persists:
  - Proposal -> ACCEPTED
  - Project -> ESCROW_CREATED
  - Escrow projection
    |
Socket.IO/event indexer updates clients
```

`blockchainEscrowId` is the canonical identifier used by the frontend, backend, Socket.IO rooms, blockchain workflows, and event indexer.

## Event Synchronization Flow

```text
ProofPayEscrow event
    |
Listener reads event from RPC provider
    |
Router sends event to projection/publisher
    |
MongoDB projection is updated idempotently
    |
Socket.IO notifies subscribed clients
```

The smart contract is the source of truth for token custody and on-chain state. MongoDB stores a queryable application projection used by APIs and realtime UI updates.
