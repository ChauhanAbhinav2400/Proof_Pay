# ProofPay State Machines

## Project Lifecycle

```text
OPEN
  |-- Cancel ------------------------------> CANCELLED
  |
  |-- Accept proposal
  |   and persist verified escrow ---------> ESCROW_CREATED

ESCROW_CREATED
  |
  |-- Freelancer accepts escrow -----------> IN_PROGRESS

IN_PROGRESS
  |
  |-- All escrow milestones settle --------> COMPLETED
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `OPEN` | `CANCELLED` | Client cancels project before escrow creation. |
| `OPEN` | `ESCROW_CREATED` | Client accepts proposal, creates escrow on-chain, and backend verifies/persists it. |
| `ESCROW_CREATED` | `IN_PROGRESS` | Freelancer accepts the escrow. |
| `IN_PROGRESS` | `COMPLETED` | Escrow settlement completes. |

### Invalid Transitions

| Transition | Reason |
| --- | --- |
| `CANCELLED -> OPEN` | Cancelled projects remain historical records. |
| `CANCELLED -> ESCROW_CREATED` | Cancelled projects must not proceed to escrow. |
| `ESCROW_CREATED -> OPEN` | Escrow creation makes the project read-only as a marketplace listing. |
| `IN_PROGRESS -> OPEN` | Active escrow work must not become an open listing again. |

## Proposal Lifecycle

```text
PENDING
  |-- Accept with verified escrow ----------> ACCEPTED
  |-- Reject ------------------------------> REJECTED
  |-- Withdraw ----------------------------> WITHDRAWN

ACCEPTED
  |
  |-- Escrow accepted by freelancer -------> CLOSED
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `PENDING` | `ACCEPTED` | Project client accepts proposal and backend persists verified escrow. |
| `PENDING` | `REJECTED` | Project client rejects the proposal where implemented. |
| `PENDING` | `WITHDRAWN` | Freelancer withdraws the proposal. |
| `ACCEPTED` | `CLOSED` | Freelancer accepts escrow and the workflow moves into escrow workspace. |

### Invalid Transitions

| Transition | Reason |
| --- | --- |
| `ACCEPTED -> PENDING` | Accepted proposals are immutable workflow records. |
| `ACCEPTED -> REJECTED` | A proposal cannot be rejected after acceptance. |
| `ACCEPTED -> WITHDRAWN` | A proposal cannot be withdrawn after acceptance. |
| `CLOSED -> PENDING` | Closed proposals are historical escrow-linked records. |
| `REJECTED -> ACCEPTED` | Rejected proposals are terminal. |
| `WITHDRAWN -> ACCEPTED` | Withdrawn proposals are terminal. |

## Escrow Lifecycle

The MongoDB escrow projection mirrors the smart contract state using backend-friendly names.

```text
PENDING_FREELANCER
  |-- Freelancer accepts escrow -----------> ACTIVE
  |-- Cancel where allowed ---------------> CANCELLED

ACTIVE
  |-- Raise dispute -----------------------> DISPUTED
  |-- Complete all milestones ------------> COMPLETED

DISPUTED
  |-- Arbitrator resolves dispute --------> COMPLETED
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `PENDING_FREELANCER` | `ACTIVE` | Freelancer signs EIP-712 acceptance and backend relays transaction. |
| `PENDING_FREELANCER` | `CANCELLED` | Escrow cancellation completes where contract allows it. |
| `ACTIVE` | `DISPUTED` | Client or freelancer raises a dispute. |
| `ACTIVE` | `COMPLETED` | All milestones are released. |
| `DISPUTED` | `COMPLETED` | Arbitrator-signed dispute resolution completes settlement. |

### Invalid Transitions

| Transition | Reason |
| --- | --- |
| `COMPLETED -> ACTIVE` | Completed escrow is terminal. |
| `COMPLETED -> DISPUTED` | Completed settlement must not be reopened in normal workflow. |
| `COMPLETED -> CANCELLED` | Completed escrow has already finalized. |
| `CANCELLED -> ACTIVE` | Cancelled escrow is terminal. |
| `CANCELLED -> COMPLETED` | Cancelled escrow cannot later settle as completed. |
| `DISPUTED -> ACTIVE` | Dispute resolution must produce a final settlement, not resume normal flow. |

## Milestone Lifecycle

Milestone state is stored in MongoDB. Token release is confirmed by the smart contract.

```text
PENDING
  |-- Freelancer submits work ------------> SUBMITTED

SUBMITTED
  |-- Client approves and contract pays --> RELEASED
  |-- Participant raises dispute ---------> DISPUTED

DISPUTED
  |-- Arbitrator resolution finalizes ----> RELEASED or final escrow settlement
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `PENDING` | `SUBMITTED` | Freelancer submits work metadata. |
| `SUBMITTED` | `RELEASED` | Client signs approval, backend relays contract transaction, and funds are released. |
| `SUBMITTED` | `DISPUTED` | Participant raises dispute before normal release. |
| `DISPUTED` | `RELEASED` | Dispute resolution settles the remaining escrow allocation. |

### Invalid Transitions

| Transition | Reason |
| --- | --- |
| `PENDING -> RELEASED` | Work must be submitted and approved or resolved first. |
| `SUBMITTED -> PENDING` | Submission history must be preserved. |
| `RELEASED -> PENDING` | Released milestone is terminal. |
| `RELEASED -> DISPUTED` | Released funds cannot be disputed in the normal milestone lifecycle. |

## Chat Lifecycle

Chat messages do not have a mutable status lifecycle.

```text
Created
  |
  |-- Persisted in MongoDB
  |
  |-- Broadcast to authorized Socket.IO room
```

### Restrictions

| Restriction | Reason |
| --- | --- |
| No generic chat room state | Chat scope is derived from `chatType` and `referenceId`. |
| Proposal chat uses proposal id | Proposal negotiation happens before escrow creation. |
| Escrow chat uses blockchainEscrowId | Escrow workspace conversation follows the canonical escrow id. |
| Message history is append-oriented | Chat should preserve workflow context and auditability. |
