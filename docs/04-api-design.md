# ProofPay API Design

## Conventions

- All authenticated endpoints require `Authorization: Bearer <token>`.
- Escrow APIs expose `blockchainEscrowId` as the public identifier.
- Responses should use consistent JSON envelopes.
- MongoDB `_id` values are internal unless explicitly required for off-chain resources such as projects and proposals.

## Authentication

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/nonce` | Create or rotate a wallet login nonce. | No | Nonce challenge. |
| `POST` | `/auth/verify` | Verify signed nonce and issue JWT. | No | JWT and user profile. |
| `GET` | `/auth/me` | Return current authenticated user. | Yes | Current user profile. |

## Projects

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/projects` | Create a project owned by the authenticated wallet. | Yes | Created project. |
| `GET` | `/projects` | List projects with filtering support. | Optional | Project list. |
| `GET` | `/projects/:projectId` | Get project details. | Optional | Project details. |
| `PATCH` | `/projects/:projectId` | Update an editable open project. | Yes | Updated project. |
| `POST` | `/projects/:projectId/cancel` | Cancel an open project. | Yes | Cancelled project. |

## Proposals

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/projects/:projectId/proposals` | Submit a proposal for an open project. | Yes | Created proposal. |
| `GET` | `/projects/:projectId/proposals` | List proposals for a project. | Yes | Proposal list. |
| `GET` | `/proposals/:proposalId` | Get proposal details. | Yes | Proposal details. |
| `PATCH` | `/proposals/:proposalId` | Update a pending proposal owned by the freelancer. | Yes | Updated proposal. |
| `POST` | `/proposals/:proposalId/withdraw` | Withdraw a pending proposal. | Yes | Withdrawn proposal. |
| `POST` | `/proposals/:proposalId/accept` | Accept one proposal for a project. | Yes | Accepted proposal. |
| `POST` | `/proposals/:proposalId/reject` | Reject a pending proposal. | Yes | Rejected proposal. |

## Escrows

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `POST` | `/escrows` | Create backend escrow configuration after proposal acceptance. | Yes | Escrow configuration or transaction intent. |
| `GET` | `/escrows` | List escrows for the authenticated wallet. | Yes | Escrow list. |
| `GET` | `/escrows/:blockchainEscrowId` | Get escrow details by canonical id. | Yes | Escrow details. |
| `POST` | `/escrows/:blockchainEscrowId/accept` | Submit or coordinate freelancer escrow acceptance. | Yes | Updated escrow or transaction result. |
| `POST` | `/escrows/:blockchainEscrowId/cancel` | Cancel escrow where allowed by contract and state. | Yes | Updated escrow or transaction result. |
| `POST` | `/escrows/:blockchainEscrowId/dispute` | Raise a dispute for an active escrow. | Yes | Disputed escrow. |
| `POST` | `/escrows/:blockchainEscrowId/resolve` | Resolve a disputed escrow through authorized dispute flow. | Yes | Completed escrow or transaction result. |

## Milestones

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `GET` | `/escrows/:blockchainEscrowId/milestones` | List milestones for an escrow. | Yes | Milestone list. |
| `POST` | `/escrows/:blockchainEscrowId/milestones/:milestoneIndex/submit` | Submit work metadata for a milestone. | Yes | Updated milestone. |
| `POST` | `/escrows/:blockchainEscrowId/milestones/:milestoneIndex/approve` | Approve current milestone and coordinate release. | Yes | Updated milestone or transaction result. |

## Chats

| Method | Route | Purpose | Auth Required | Expected Response |
| --- | --- | --- | --- | --- |
| `GET` | `/chats/proposals/:proposalId/messages` | Get proposal chat messages. | Yes | Chronological message list. |
| `POST` | `/chats/proposals/:proposalId/messages` | Send a proposal chat message. | Yes | Created message. |
| `GET` | `/chats/escrows/:blockchainEscrowId/messages` | Get escrow chat messages. | Yes | Chronological message list. |
| `POST` | `/chats/escrows/:blockchainEscrowId/messages` | Send an escrow chat message. | Yes | Created message. |

## Socket.IO Events

| Event | Direction | Purpose |
| --- | --- | --- |
| `proposal:join` | Client to server | Join `proposal-{proposalId}` room after authorization. |
| `proposal:message` | Server to client | Broadcast proposal chat message. |
| `escrow:join` | Client to server | Join `escrow-{blockchainEscrowId}` room after authorization. |
| `escrow:message` | Server to client | Broadcast escrow chat message. |
| `escrow:updated` | Server to client | Broadcast escrow state or milestone updates. |
