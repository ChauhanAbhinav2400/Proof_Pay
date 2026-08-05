# ProofPay API Design

## Conventions

- Authenticated endpoints require `Authorization: Bearer <token>`.
- Escrow APIs expose `blockchainEscrowId` as the public identifier.
- Project and proposal APIs expose MongoDB ids because those are off-chain marketplace resources.
- MongoDB `_id` values are otherwise internal unless explicitly returned as public `id`.
- Contract addresses are loaded from the configured deployment file, not from hardcoded application logic.

## Authentication

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/nonce` | Create or rotate a wallet login nonce challenge. Does not create a user. | No | `{ nonce }` |
| `POST` | `/auth/verify` | Verify signed nonce, create user if needed, consume nonce, and issue JWT. | No | `{ token, user }` |

## Users

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `GET` | `/users/wallets/:walletAddress/exists` | Check whether a wallet user exists. | Yes | Boolean |
| `GET` | `/users/wallets/:walletAddress` | Get user by wallet address. | Yes | User profile |
| `GET` | `/users/:userId` | Get user by id. | Yes | User profile |
| `PATCH` | `/users/:userId` | Update optional profile fields. | Yes | Updated user |
| `PATCH` | `/users/:userId/permissions` | Update user permissions where authorized. | Yes | Updated user |

## Projects

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/projects` | Create a project owned by the authenticated wallet. | Yes | Created project |
| `GET` | `/projects` | List open projects with pagination options. | No | Project list |
| `GET` | `/projects/clients/:clientWallet` | List projects created by a client wallet. | No | Project list |
| `GET` | `/projects/:projectId/exists` | Check whether a project exists. | No | Boolean |
| `GET` | `/projects/:projectId` | Get project details. | No | Project details |
| `PATCH` | `/projects/:projectId` | Update an editable open project. | Yes | Updated project |
| `POST` | `/projects/:projectId/cancel` | Cancel an open project. | Yes | Cancelled project |

## Proposals

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/projects/:projectId/proposals` | Submit a proposal for an open project. | Yes | Created proposal |
| `GET` | `/projects/:projectId/proposals` | List proposals for a project. | Yes | Proposal list |
| `GET` | `/proposals/freelancers/:freelancerWallet` | List proposals submitted by a freelancer wallet. | Yes | Proposal list |
| `GET` | `/proposals/:proposalId/exists` | Check whether a proposal exists. | Yes | Boolean |
| `GET` | `/proposals/:proposalId` | Get proposal details. | Yes | Proposal details |
| `PATCH` | `/proposals/:proposalId` | Update a pending proposal owned by the freelancer. | Yes | Updated proposal |
| `POST` | `/proposals/:proposalId/withdraw` | Withdraw a pending proposal. | Yes | Withdrawn proposal |
| `POST` | `/proposals/:proposalId/accept` | Accept proposal and persist an already-created on-chain escrow. | Yes | `{ proposal, escrow }` |

### Proposal Acceptance Payload

The frontend creates the escrow on-chain first. The accept endpoint receives the escrow proof and verifies it:

```json
{
  "tokenAddress": "0x...",
  "acceptanceDeadline": "2026-08-03T10:42:00.000Z",
  "milestones": [
    {
      "title": "First Pay",
      "description": "Initial delivery",
      "amount": "25000000"
    }
  ],
  "blockchainEscrowId": "1",
  "transactionHash": "0x..."
}
```

Milestone `amount` values are token base units. MockUSDT uses 6 decimals, so `25 USDT` is sent as `25000000`.

## Escrows

The mounted route prefix is singular: `/escrow`.

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/escrow` | Backend create-escrow route retained for service/API completeness. The frontend proposal acceptance flow should be preferred. | Yes | Escrow transaction result |
| `GET` | `/escrow` | List escrows for the authenticated freelancer wallet. | Yes | Escrow list |
| `GET` | `/escrow/disputes` | List disputed escrows for arbitrators. | Yes + `ARBITRATOR` | Escrow list |
| `GET` | `/escrow/:blockchainEscrowId/exists` | Check whether escrow projection exists. | Yes | Boolean |
| `GET` | `/escrow/:blockchainEscrowId` | Get escrow details by canonical id and synchronize status from chain where needed. | Yes | Escrow details |
| `POST` | `/escrow/:blockchainEscrowId/accept` | Submit freelancer EIP-712 acceptance signature. | Yes | Escrow transaction result |
| `POST` | `/escrow/:blockchainEscrowId/milestones/:milestoneIndex/submit` | Mark the current milestone as submitted for review. | Yes | Updated escrow |
| `POST` | `/escrow/:blockchainEscrowId/milestones/:milestoneIndex/approve` | Submit client EIP-712 approval signature and release current milestone on-chain. | Yes | Escrow transaction result |
| `POST` | `/escrow/:blockchainEscrowId/milestones/:milestoneIndex/release` | Alias for approval/release flow. | Yes | Escrow transaction result |
| `POST` | `/escrow/:blockchainEscrowId/dispute` | Confirm frontend dispute transaction hash or raise dispute through backend path where applicable. | Yes | Escrow transaction result |
| `POST` | `/escrow/:blockchainEscrowId/resolve` | Resolve a disputed escrow with arbitrator EIP-712 settlement signature. | Yes | Escrow transaction result |
| `POST` | `/escrow/:blockchainEscrowId/cancel` | Cancel escrow where allowed by contract and state. | Yes | Escrow transaction result |

## Chat

The mounted route prefix is `/chat`.

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `GET` | `/chat/proposals/:proposalId/messages` | Get proposal chat messages. | Yes | Chronological message list |
| `POST` | `/chat/proposals/:proposalId/messages` | Send a proposal chat message. | Yes | Created message |
| `GET` | `/chat/escrows/:blockchainEscrowId/messages` | Get escrow chat messages. | Yes | Chronological message list |
| `POST` | `/chat/escrows/:blockchainEscrowId/messages` | Send an escrow chat message. | Yes | Created message |

## Storage

The mounted route prefix is `/storage`.

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/storage/upload` | Upload a file to configured S3 bucket. | Yes | Upload metadata |
| `GET` | `/storage/download/:key` | Download a stored object. | Yes | File stream |
| `GET` | `/storage/signed-url/:key` | Generate a signed download URL. | Yes | Signed URL metadata |
| `DELETE` | `/storage/:key` | Delete a stored object. | Yes | Delete result |

## Admin

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `GET` | `/admin/summary` | Aggregated admin dashboard counts and recent records. | Yes + `ADMIN` | Admin summary |

## Socket.IO Events

### Client to Server

| Event | Purpose |
| --- | --- |
| `joinRoom` | Join a deterministic proposal or escrow room. |
| `leaveRoom` | Leave a deterministic room. |
| `typing` | Broadcast typing state to other room members. |
| `stopTyping` | Broadcast stopped-typing state. |
| `sendMessage` | Persist and broadcast a chat message. |

`sendMessage` payload:

```json
{
  "room": "proposal-<proposalId>",
  "payload": {
    "chatType": "PROPOSAL",
    "referenceId": "<proposalId>",
    "message": "Hello",
    "attachments": []
  }
}
```

### Server to Client

| Event | Purpose |
| --- | --- |
| `messageCreated` | Broadcast newly persisted chat message. |
| `userJoined` | Notify room members that a user joined. |
| `userLeft` | Notify room members that a user left. |
| `typingStarted` | Notify room members that a user is typing. |
| `typingStopped` | Notify room members that a user stopped typing. |
| `escrowCreated` | Broadcast escrow creation event. |
| `escrowUpdated` | Broadcast escrow update event. |
| `escrowCancelled` | Broadcast escrow cancellation event. |
| `disputeRaised` | Broadcast dispute-raised event. |
| `disputeResolved` | Broadcast dispute-resolved event. |
| `projectCancelled` | Broadcast project cancellation. |
| `proposalAccepted` | Broadcast proposal acceptance. |
| `error` | Broadcast socket error payload. |
