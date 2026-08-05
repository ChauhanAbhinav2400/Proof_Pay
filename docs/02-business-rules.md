# ProofPay Business Rules

## User

| Rule | Description |
| --- | --- |
| Wallet identity | One normalized wallet address represents one account. |
| Wallet authentication only | Users authenticate by signing a backend-issued nonce. |
| User created after verification | `/auth/nonce` does not create users; the user is created only after successful `/auth/verify`. |
| No password storage | Passwords, private keys, JWTs, refresh tokens, and signatures are not stored on the user record. |
| Optional profile | `displayName`, `email`, and `avatarUrl` are optional. Do not invent default display names. |
| No fixed marketplace role | A wallet can act as client or freelancer depending on the project, proposal, or escrow context. |
| System permissions only | Permissions are `USER`, `ADMIN`, and `ARBITRATOR`. Permissions are the source of truth for privileged UI/API access. |

## Project

| Rule | Description |
| --- | --- |
| Project is off-chain | Projects exist before blockchain escrow creation. |
| Client ownership | A project belongs to the wallet stored as `clientWallet`. |
| Proposal eligibility | Only `OPEN` projects accept proposals. |
| Escrow transition | Once a proposal acceptance is verified and escrow is persisted, project status becomes `ESCROW_CREATED`. |
| In-progress transition | Once the freelancer accepts the escrow, project status becomes `IN_PROGRESS`. |
| Read-only after escrow | Projects with escrow-related statuses must not be modified as open marketplace listings. |
| Cancellation retention | Cancelled projects remain in the database. |
| No delete workflow | Project cancellation is represented by state, not physical deletion. |

## Proposal

| Rule | Description |
| --- | --- |
| Proposal is off-chain | Proposals are created before blockchain escrow exists. |
| Freelancer ownership | A proposal belongs to `freelancerWallet`. |
| One proposal per freelancer | A freelancer can submit only one proposal per project. |
| Proposal acceptance entry point | Accepting a proposal is the user-facing entry point for escrow creation. |
| Accepted proposal requires escrow verification | Proposal and project state must not change unless the on-chain escrow was created and verified. |
| Accepted proposal immutability | Accepted proposals must not be edited as ordinary pending proposals. |
| Closed after escrow activation | Accepted proposals become `CLOSED` after the freelancer accepts the escrow and work moves into the escrow workspace. |
| Withdrawn proposal | A withdrawn proposal must not be accepted later. |
| Rejected proposal | A rejected proposal must not be accepted later. |

## Escrow

| Rule | Description |
| --- | --- |
| Escrow starts through proposal acceptance | The client accepts a proposal, approves MockUSDT if needed, creates the escrow on-chain, then the backend verifies and persists it. |
| No separate frontend create-escrow workflow | The frontend should not expose an independent create-escrow page/API flow. |
| One escrow per project | A project must map to only one escrow. |
| One escrow per proposal | An accepted proposal must map to only one escrow. |
| Canonical identifier | `blockchainEscrowId` is the canonical identifier across frontend, backend, Socket.IO, blockchain, and indexer. |
| Mongo `_id` is internal | API consumers should use `blockchainEscrowId`, not MongoDB `_id`, for escrow workflows. |
| Contract is fund authority | Token custody and on-chain settlement are controlled by the smart contract. |
| Backend stores projection | MongoDB stores the queryable application projection of escrow state. |
| Sync before returning critical state | Backend reads may synchronize escrow status from the contract before returning data. |

## Milestone

| Rule | Description |
| --- | --- |
| Embedded in escrow | Milestones are embedded inside the Escrow document. |
| No milestone collection | Milestones must not be stored in a separate MongoDB collection. |
| Ordered release | Milestone approval follows the configured milestone order. |
| Submission before approval | A freelancer marks the current milestone submitted before the client approves release. |
| Approval releases funds | Client approval triggers the contract milestone release and backend persistence only after blockchain confirmation. |
| Submission files are metadata | Files are not stored in MongoDB; only attachment metadata is stored. |
| Released milestone is terminal | A released milestone must not move back to pending, submitted, approved, or disputed. |

## Chat

| Rule | Description |
| --- | --- |
| No generic rooms | Chat belongs to either a proposal or an escrow. |
| Proposal chat | Proposal chat uses `chatType = PROPOSAL` and `referenceId = proposalId`. |
| Escrow chat | Escrow chat uses `chatType = ESCROW` and `referenceId = blockchainEscrowId`. |
| Proposal chat after escrow | Proposal chat becomes read-only once the workflow moves into the escrow workspace. |
| Escrow access | Escrow chat is accessible to escrow participants. |
| Socket rooms are derived | Rooms are generated dynamically as `proposal-{proposalId}` or `escrow-{blockchainEscrowId}`. |
| Attachments are metadata | Chat attachments store S3 metadata only, not file contents. |

## Storage

| Rule | Description |
| --- | --- |
| Single S3 bucket | ProofPay uses one configured S3 bucket. |
| Metadata in MongoDB | MongoDB stores object metadata and keys, not binary file data. |
| Signed downloads | Attachments are downloaded through signed URLs. |
| Storage is infrastructure | Storage service must not contain marketplace business logic. |

## Authentication

| Rule | Description |
| --- | --- |
| Nonce challenge | Wallet login requires requesting and signing a nonce. |
| Nonce TTL | Nonce challenges expire and are stored separately from users. |
| Signature verification | The recovered signer must match the normalized wallet address. |
| Nonce consumption | A nonce must be consumed after successful verification to prevent replay. |
| JWT authorization | Authenticated REST and Socket.IO requests require a valid backend token. |
| Stateless logout | Logout is frontend-only: clear JWT/session state and disconnect wallet/socket. |

## Authorization

| Rule | Description |
| --- | --- |
| Project mutations | Only the project client can modify or cancel the project where allowed by state. |
| Proposal mutations | Only the proposal freelancer can modify or withdraw their proposal where allowed by state. |
| Proposal acceptance | Only the project client can accept a proposal. |
| Escrow participant access | Escrow participants can access escrow workflows. |
| Admin capability | `ADMIN` permission is required for admin summary access. |
| Arbitrator capability | `ARBITRATOR` permission is required for arbitrator views and disputed escrow listing. |

## Disputes

| Rule | Description |
| --- | --- |
| Active escrow required | Disputes apply only to active escrow workflows. |
| Participant initiated | A dispute may be raised by an escrow participant through the connected wallet. |
| Backend confirmation | When the frontend sends a dispute transaction hash, the backend confirms the transaction and synchronizes MongoDB. |
| Disputed escrow freezes normal release | Normal milestone progression stops while escrow is disputed. |
| Arbitrator-signed resolution | The arbitrator signs the EIP-712 settlement message. |
| Resolution comes from contract flow | Final dispute settlement must match the smart contract result. |
| Event-driven settlement | Backend settlement projection must be reconstructable from contract events. |
