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
