## Bug #1 - Stale Cached Storage Variable

### Function

approveMilestone()

### Cause

Cached `currentMilestone` before incrementing the storage value.

### Symptom

Final milestone never changed the escrow state to `Completed`.

### Fix

Used the updated storage value for the completion check.

### Lesson

Be careful when caching storage variables that are modified later in the function.

## Bug #2 - Stack Too Deep Error

### Function

test_RaiseDispute_OnlyChangesEscrowState()

### Cause

Declared and unpacked too many local variables in a single function, exceeding the EVM stack limit of 16 accessible stack slots.

### Symptom

Compilation failed with:
`Stack too deep. Try compiling with --via-ir or remove local variables.`

### Fix

Reduced the number of local variables by avoiding unnecessary tuple unpacking and reading only the required values.

### Lesson

The EVM stack has a limited number of accessible stack slots. If a function has too many local variables or tuple-unpacked values, the compiler will throw a `Stack too deep` error. Keep functions small and avoid unnecessary local variables.

## Bug #3 - Arbitrator Can Become Freelancer and Drain Escrow

### Bug Found

While testing the complete ProofPay flow, I found a serious security issue.

The arbitrator wallet is currently allowed to submit proposals just like a normal freelancer.

If the client accidentally accepts the arbitrator's proposal, the following flow becomes possible:

1. Arbitrator submits a proposal.
2. Client accepts the proposal.
3. Escrow is created with the arbitrator as the freelancer.
4. Arbitrator raises a dispute.
5. Since the arbitrator is also the freelancer, the `onlyClientOrFreelancer` check passes.
6. The dispute is assigned to the arbitrator.
7. The arbitrator resolves the dispute in their own favor and can transfer the entire escrow amount to themselves.

### Root Cause

The contract correctly checks that only the client or freelancer can raise a dispute.

However, it does **not** prevent the arbitrator from becoming the freelancer in the first place.

As a result, the arbitrator satisfies both roles:

- Freelancer
- Arbitrator

This creates a conflict of interest and allows the arbitrator to control both sides of the dispute process.

### Fix

Prevent the arbitrator address from participating in an escrow as a client or freelancer.

The simplest fix is to add a check before allowing the arbitrator to participate:

```solidity
require(msg.sender != arbitrator, "Arbitrator cannot participate in escrows");
```
