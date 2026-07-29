# ProofPay System Architecture

## Overview

ProofPay is a Web3 freelancer marketplace where project discovery, proposals, acceptance, and pre-escrow collaboration are handled off-chain. Blockchain interaction begins only after a client accepts a proposal and configures escrow milestones.

The backend provides the application boundary for authentication, marketplace data, chat coordination, blockchain transaction orchestration, and contract event synchronization.

## High-Level Component Diagram

```text
Client Application
    |
    | REST API / Socket.IO
    v
Express Backend
    |
    |--------------------------|
    |                          |
    v                          v
MongoDB                    Ethereum RPC
    |                          |
    |                          v
Application Data        ProofPayEscrow / MockUSDT
    |
    v
Socket.IO Presence and Messaging
```

## Backend Responsibilities

- Authenticate wallets and issue backend session tokens.
- Validate API inputs and enforce authorization rules.
- Persist users, projects, proposals, escrows, milestones, and chat messages.
- Coordinate off-chain marketplace flows before escrow creation.
- Submit blockchain transactions through the configured relayer wallet where required.
- Read contract state and transaction receipts through the shared blockchain configuration layer.
- Synchronize contract events into MongoDB for API and realtime consumers.
- Emit Socket.IO updates for proposal chat, escrow chat, and workflow changes.

## Blockchain Responsibilities

- Custody escrowed ERC20 funds.
- Enforce on-chain escrow state transitions.
- Verify EIP-712 signatures for gasless flows.
- Release funds, refund funds, cancel escrows, and resolve disputes according to the smart contract.
- Emit canonical events used by the backend indexer.

## MongoDB Responsibilities

- Store all off-chain marketplace data.
- Store canonical backend projections of blockchain escrows.
- Store proposal and escrow chat messages.
- Preserve cancelled projects and historical workflow records.
- Enforce database-level uniqueness where required, such as one proposal per freelancer per project and one document per blockchain escrow id.

## Socket.IO Responsibilities

- Provide realtime proposal chat and escrow chat delivery.
- Broadcast relevant workflow updates to authorized participants.
- Use deterministic room names generated from application identifiers:
  - `proposal-{proposalId}`
  - `escrow-{blockchainEscrowId}`
- Never act as the source of truth for authorization or persistence.

## Authentication Flow

```text
Wallet requests nonce
    |
Backend stores nonce for wallet
    |
Wallet signs nonce
    |
Backend verifies signature
    |
Backend issues JWT
    |
Authenticated API / Socket.IO access
```

Authentication is wallet-based. A wallet represents one account. User permissions are system permissions only, such as `USER` and `ADMIN`.

## Escrow Creation Flow

```text
Client posts project
    |
Freelancers submit proposals
    |
Client accepts one proposal
    |
Backend marks proposal/project state
    |
Client configures escrow milestones
    |
Backend submits or coordinates contract transaction
    |
Contract emits escrow event
    |
Backend stores Escrow projection with blockchainEscrowId
```

`blockchainEscrowId` is the canonical identifier used by the frontend, backend, Socket.IO, blockchain workflows, and event indexer.

## Event Synchronization Flow

```text
ProofPayEscrow event
    |
Indexer reads event from RPC provider
    |
Backend validates event relevance
    |
MongoDB projection is updated
    |
Socket.IO notifies authorized clients
```

The backend must treat contract events as the authoritative source for on-chain state changes. MongoDB stores an application projection used for querying, filtering, and realtime UI updates.
