# ProofPay State Machines

## Project Lifecycle

```text
OPEN
  |-- Cancel -----------------> CANCELLED
  |
  |-- Accepted proposal
  |   and escrow created -----> ESCROW_CREATED
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `OPEN` | `CANCELLED` | Client cancels project before escrow creation. |
| `OPEN` | `ESCROW_CREATED` | Client accepts a proposal and escrow is created. |

### Invalid Transitions

| Transition | Reason |
| --- | --- |
| `CANCELLED -> OPEN` | Cancelled projects remain historical records. |
| `CANCELLED -> ESCROW_CREATED` | Cancelled projects must not proceed to escrow. |
| `ESCROW_CREATED -> OPEN` | Escrow creation makes the project read-only as a listing. |
| `ESCROW_CREATED -> CANCELLED` | Cancellation after escrow creation is handled by escrow lifecycle, not project lifecycle. |

## Proposal Lifecycle

```text
PENDING
  |-- Accept -----> ACCEPTED
  |-- Reject -----> REJECTED
  |-- Withdraw ---> WITHDRAWN
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `PENDING` | `ACCEPTED` | Project client accepts the proposal. |
| `PENDING` | `REJECTED` | Project client rejects the proposal. |
| `PENDING` | `WITHDRAWN` | Freelancer withdraws the proposal. |

### Invalid Transitions

| Transition | Reason |
| --- | --- |
| `ACCEPTED -> PENDING` | Accepted proposals are immutable workflow records. |
| `ACCEPTED -> REJECTED` | A proposal cannot be rejected after acceptance. |
| `ACCEPTED -> WITHDRAWN` | A proposal cannot be withdrawn after acceptance. |
| `REJECTED -> ACCEPTED` | Rejected proposals are terminal. |
| `WITHDRAWN -> ACCEPTED` | Withdrawn proposals are terminal. |

## Escrow Lifecycle

```text
ACTIVE
  |-- Raise dispute ----------> DISPUTED
  |-- Complete milestones ----> COMPLETED
  |-- Cancel -----------------> CANCELLED

DISPUTED
  |-- Resolve dispute --------> COMPLETED
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `ACTIVE` | `DISPUTED` | Client or freelancer raises a dispute. |
| `ACTIVE` | `COMPLETED` | All milestones are released. |
| `ACTIVE` | `CANCELLED` | Contract cancellation flow completes where allowed. |
| `DISPUTED` | `COMPLETED` | Authorized dispute resolution completes settlement. |

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

```text
PENDING
  |-- Submit work ------------> SUBMITTED

SUBMITTED
  |-- Approve work -----------> APPROVED
  |-- Raise dispute ----------> DISPUTED

APPROVED
  |-- Release payment --------> RELEASED

DISPUTED
  |-- Resolve through escrow -> RELEASED
```

### Valid Transitions

| From | To | Trigger |
| --- | --- | --- |
| `PENDING` | `SUBMITTED` | Freelancer submits work metadata. |
| `SUBMITTED` | `APPROVED` | Client approves submitted work. |
| `APPROVED` | `RELEASED` | Payment release is confirmed. |
| `SUBMITTED` | `DISPUTED` | Participant raises dispute for submitted work. |
| `DISPUTED` | `RELEASED` | Dispute resolution releases the milestone amount or final settlement allocation. |

### Invalid Transitions

| Transition | Reason |
| --- | --- |
| `PENDING -> RELEASED` | Work must be submitted and approved or resolved first. |
| `SUBMITTED -> PENDING` | Submission history must be preserved. |
| `APPROVED -> SUBMITTED` | Approval is a forward-only workflow step. |
| `RELEASED -> PENDING` | Released milestone is terminal. |
| `RELEASED -> DISPUTED` | Released funds cannot be disputed in the normal milestone lifecycle. |

## Chat Lifecycle

Chat messages do not have a mutable status lifecycle.

```text
Created
  |
  |-- Persisted
  |
  |-- Broadcast to authorized room
```

### Restrictions

| Restriction | Reason |
| --- | --- |
| No generic chat room state | Chat scope is derived from `chatType` and `referenceId`. |
| Proposal chat requires proposal access | Prevents unrelated users from reading proposal negotiation. |
| Escrow chat requires escrow participation | Prevents unrelated users from reading escrow communication. |
| Message history is append-oriented | Chat should preserve workflow context and auditability. |
