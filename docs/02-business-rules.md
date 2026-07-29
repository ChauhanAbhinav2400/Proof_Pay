# ProofPay Business Rules

## User

| Rule | Description |
| --- | --- |
| Wallet identity | One wallet address represents one account. |
| Wallet authentication only | Users authenticate by signing a backend-issued nonce. |
| No password storage | Passwords, private keys, JWTs, refresh tokens, and signatures are not stored on the user record. |
| No fixed marketplace role | A wallet can act as client or freelancer depending on the project, proposal, or escrow context. |
| System permissions only | User permissions are limited to system-level permissions such as `USER` and `ADMIN`. |

## Project

| Rule | Description |
| --- | --- |
| Project is off-chain | Projects exist before blockchain escrow creation. |
| Client ownership | A project belongs to the wallet stored as `clientWallet`. |
| Proposal eligibility | Only `OPEN` projects accept proposals. |
| Escrow transition | Once escrow is created, the project status becomes `ESCROW_CREATED`. |
| Read-only after escrow | Projects with `ESCROW_CREATED` status must not be modified as active marketplace listings. |
| Cancellation retention | Cancelled projects remain in the database. |
| No delete workflow | Project cancellation is represented by state, not physical deletion. |

## Proposal

| Rule | Description |
| --- | --- |
| Proposal is off-chain | Proposals are created before blockchain escrow exists. |
| Freelancer ownership | A proposal belongs to `freelancerWallet`. |
| One proposal per freelancer | A freelancer can submit only one proposal per project. |
| Accepted proposal uniqueness | A client accepts one proposal for a project before configuring escrow. |
| Accepted proposal immutability | Accepted proposals must not be edited as ordinary pending proposals. |
| Withdrawn proposal | A withdrawn proposal must not be accepted later. |
| Rejected proposal | A rejected proposal must not be accepted later. |

## Escrow

| Rule | Description |
| --- | --- |
| Escrow starts after proposal acceptance | Blockchain escrow is introduced only after the client accepts a proposal. |
| One escrow per project | A project must map to only one escrow. |
| One escrow per proposal | An accepted proposal must map to only one escrow. |
| Canonical identifier | `blockchainEscrowId` is the canonical identifier across frontend, backend, Socket.IO, blockchain, and indexer. |
| Mongo `_id` is internal | API consumers should use `blockchainEscrowId`, not MongoDB `_id`, for escrow workflows. |
| Contract is fund authority | Token custody and on-chain settlement are controlled by the smart contract. |
| Backend stores projection | MongoDB stores the queryable application projection of escrow state. |

## Milestone

| Rule | Description |
| --- | --- |
| Embedded in escrow | Milestones are embedded inside the Escrow document. |
| No milestone collection | Milestones must not be stored in a separate MongoDB collection. |
| Ordered release | Milestone workflow follows the configured milestone order. |
| Submission files are metadata | Files are not stored in MongoDB; only attachment metadata is stored. |
| Released milestone is terminal | A released milestone must not move back to pending, submitted, approved, or disputed. |

## Chat

| Rule | Description |
| --- | --- |
| No generic rooms | Chat belongs to either a proposal or an escrow. |
| Proposal chat | Proposal chat uses `chatType = PROPOSAL` and `referenceId = proposalId`. |
| Escrow chat | Escrow chat uses `chatType = ESCROW` and `referenceId = blockchainEscrowId`. |
| Proposal access | Proposal chat is accessible only to the project client and proposal owner. |
| Escrow access | Escrow chat is accessible only to escrow participants. |
| Socket rooms are derived | Rooms are generated dynamically as `proposal-{proposalId}` or `escrow-{blockchainEscrowId}`. |
| Attachments are metadata | Chat attachments store metadata only, not file contents. |

## Authentication

| Rule | Description |
| --- | --- |
| Nonce challenge | Wallet login requires requesting and signing a nonce. |
| Signature verification | The recovered signer must match the normalized wallet address. |
| Nonce rotation | A nonce must be rotated after successful verification. |
| JWT authorization | Authenticated REST and Socket.IO requests require a valid backend token. |

## Authorization

| Rule | Description |
| --- | --- |
| Project mutations | Only the project client can modify or cancel the project where allowed by state. |
| Proposal mutations | Only the proposal freelancer can modify or withdraw their proposal where allowed by state. |
| Proposal acceptance | Only the project client can accept a proposal. |
| Escrow access | Only escrow participants and authorized system actors can access escrow details. |
| Admin capability | `ADMIN` permission is reserved for system-level operations. |

## Disputes

| Rule | Description |
| --- | --- |
| Active escrow required | Disputes apply only to active escrow workflows. |
| Participant initiated | A dispute may be raised by an escrow participant. |
| Disputed escrow freezes normal release | Normal milestone progression stops while escrow is disputed. |
| Resolution comes from contract flow | Final dispute settlement must match the smart contract result. |
| Event-driven settlement | Backend settlement projection must be reconstructable from contract events. |
