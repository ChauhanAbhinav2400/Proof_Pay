# ProofPay Database Design

## User

### Purpose

Stores wallet-authenticated user accounts and system permissions.

### Important Fields

| Field | Description |
| --- | --- |
| `walletAddress` | Unique normalized wallet address. |
| `displayName` | Optional user display name. |
| `email` | Optional user email. |
| `avatarUrl` | Optional avatar URL. |
| `permissions` | System permissions. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### Enums

`permissions`:

- `USER`
- `ADMIN`
- `ARBITRATOR`

### Indexes

| Index | Purpose |
| --- | --- |
| `walletAddress` unique | Enforces one account per wallet. |

### Relationships

Marketplace documents reference users by wallet address rather than user ObjectId.

## NonceChallenge

### Purpose

Stores temporary wallet-login nonce challenges separately from users.

### Important Fields

| Field | Description |
| --- | --- |
| `walletAddress` | Normalized wallet address requesting login. |
| `nonce` | Random challenge string signed by the wallet. |
| `expiresAt` | Expiration timestamp used for TTL cleanup. |
| `consumedAt` | Set when a nonce is successfully used. |

### Rules

`/auth/nonce` creates or replaces a challenge. Users are not created until `/auth/verify` succeeds.

## Project

### Purpose

Represents work posted by a client before blockchain escrow exists.

### Important Fields

| Field | Description |
| --- | --- |
| `clientWallet` | Wallet address of the project owner. |
| `title` | Project title. |
| `description` | Project description. |
| `budget` | Budget stored as a string to avoid precision loss. |
| `currency` | Currency or token identifier. |
| `expectedDuration` | Client-provided expected duration. |
| `skills` | Required skills. |
| `attachments` | Project attachment metadata. |
| `status` | Project lifecycle state. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### Enums

`status`:

- `OPEN`
- `ESCROW_CREATED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### Indexes

| Index | Purpose |
| --- | --- |
| `clientWallet` | Lists projects by client. |
| `status` | Filters by lifecycle state. |
| `{ clientWallet, status }` | Lists client projects by state. |

### Relationships

Projects are referenced by Proposal and Escrow documents through `projectId`.

## Proposal

### Purpose

Represents a freelancer proposal for a project before escrow creation.

### Important Fields

| Field | Description |
| --- | --- |
| `projectId` | MongoDB ObjectId reference to Project. |
| `freelancerWallet` | Wallet address of the proposer. |
| `coverLetter` | Freelancer proposal text. |
| `proposedBudget` | Proposed budget stored as a string. |
| `estimatedDuration` | Freelancer-provided duration estimate. |
| `status` | Proposal lifecycle state. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### Enums

`status`:

- `PENDING`
- `ACCEPTED`
- `CLOSED`
- `REJECTED`
- `WITHDRAWN`

### Indexes

| Index | Purpose |
| --- | --- |
| `projectId` | Lists proposals for a project. |
| `status` | Filters proposals by state. |
| `{ projectId, freelancerWallet }` unique | Enforces one proposal per freelancer per project. |
| `{ projectId, status }` | Lists proposals by project and state. |

### Relationships

Proposal belongs to one Project. An accepted Proposal can be linked to one Escrow through `proposalId`.

## Escrow

### Purpose

Stores the backend projection of one blockchain escrow.

### Important Fields

| Field | Description |
| --- | --- |
| `blockchainEscrowId` | Canonical escrow identifier shared across all systems. |
| `projectId` | MongoDB ObjectId reference to Project. |
| `proposalId` | MongoDB ObjectId reference to Proposal. |
| `clientWallet` | Escrow client wallet. |
| `freelancerWallet` | Escrow freelancer wallet. |
| `tokenAddress` | ERC20 token address. |
| `totalAmount` | Total escrow amount in token base units, stored as a string. |
| `transactionHash` | Escrow creation transaction hash. |
| `status` | Escrow lifecycle state. |
| `milestones` | Embedded milestone list. |
| `attachments` | Escrow attachment metadata. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### Enums

`status`:

- `PENDING_FREELANCER`
- `ACTIVE`
- `DISPUTED`
- `COMPLETED`
- `CANCELLED`

### Embedded Documents

Escrow embeds Milestone documents and Attachment metadata documents.

### Indexes

| Index | Purpose |
| --- | --- |
| `blockchainEscrowId` unique | Enforces one database projection per blockchain escrow. |
| `projectId` | Finds escrow by project. |
| `proposalId` | Finds escrow by accepted proposal. |
| `clientWallet` | Lists escrows for a client. |
| `freelancerWallet` | Lists escrows for a freelancer. |
| `status` | Filters by escrow lifecycle state. |
| `{ projectId, proposalId }` | Resolves escrow from marketplace context. |
| `{ clientWallet, status }` | Lists client escrows by state. |
| `{ freelancerWallet, status }` | Lists freelancer escrows by state. |

### Relationships

Escrow belongs to one Project and one Proposal. It is externally identified by `blockchainEscrowId`.

## Milestone

### Purpose

Represents a unit of escrow work and payment. Milestones are embedded inside Escrow.

### Important Fields

| Field | Description |
| --- | --- |
| `title` | Milestone title. |
| `description` | Milestone description. |
| `amount` | Milestone amount in token base units, stored as a string. |
| `status` | Milestone lifecycle state. |
| `submissionFiles` | Attachment metadata for submitted work. |
| `submittedAt` | Submission timestamp. |
| `approvedAt` | Approval timestamp. |
| `releasedAt` | Release timestamp. |

### Enums

`status`:

- `PENDING`
- `SUBMITTED`
- `APPROVED`
- `RELEASED`
- `DISPUTED`

### Relationships

Milestone is embedded inside Escrow and has no standalone collection.

## ChatMessage

### Purpose

Stores proposal and escrow chat messages.

### Important Fields

| Field | Description |
| --- | --- |
| `chatType` | Chat scope: proposal or escrow. |
| `referenceId` | Proposal ObjectId or blockchain escrow id. |
| `senderWallet` | Wallet address of sender. |
| `message` | Message body. |
| `attachments` | Message attachment metadata. |
| `createdAt` | Message creation timestamp. |

### Enums

`chatType`:

- `PROPOSAL`
- `ESCROW`

### Indexes

| Index | Purpose |
| --- | --- |
| `chatType` | Filters by chat type. |
| `referenceId` | Fetches messages for a proposal or escrow. |
| `{ chatType, referenceId, createdAt }` | Efficient chronological chat history lookup. |

### Relationships

For proposal chat, `referenceId` stores a Proposal ObjectId. For escrow chat, `referenceId` stores `blockchainEscrowId`.

## Attachment Metadata

Attachments across projects, escrows, milestones, and chat store metadata only:

| Field | Description |
| --- | --- |
| `key` or `fileUrl` | S3 object identifier or URL depending on context. |
| `fileName` | Original/display file name. |
| `mimeType` | File MIME type. |
| `size` | File size in bytes. |
| `uploadedBy` | Wallet address of uploader. |

Binary file contents are stored in S3, not MongoDB.
