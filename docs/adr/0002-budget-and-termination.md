# 0002: Admit bounded work and stop through cooperative abort

Status: **Provisional scaffold default**

## Context

The user requires deterministic step/token/timeout termination. Provider billing and untrusted process termination are not implemented yet.

## Decision

Count steps before dispatch. Reserve known token costs or upper bounds before paid work; reject an oversized reservation without increasing usage. Use a monotonic injected clock and deadline signal raced against the active async step. Revoke contexts after each step/run. Expose explicit completion, budget, cancellation and agent-error terminal reasons.

A completed final step wins over exact step/token exhaustion. An elapsed deadline wins over completion. Concurrent exhaustion is resolved by timeout, then step limit, then token limit. Emit exactly one terminal event for a run whose ledger remains writable.

## Consequences

Tests need no real sleeps. Reservations are conservative and are not measured provider usage. Future gateways must reserve input plus capped output. Signal-aware adapters can cancel work; in-process JavaScript cannot forcibly interrupt CPU loops, blocked I/O or a tool that ignores abort.

## Implementation

[`budget.ts`](../../src/runtime/budget.ts), [`runner.ts`](../../src/runtime/runner.ts), [`types.ts`](../../src/runtime/types.ts).

## Validation

`npm test`: exact step/token boundaries, final-step completion, hanging-step timeout, pre-cancelled run, revoked contexts and late tool results in `tests/runtime-budget.test.ts`.
