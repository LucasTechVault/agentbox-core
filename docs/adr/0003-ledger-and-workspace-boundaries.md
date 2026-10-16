# 0003: Persist local events and mount file snapshots

Status: **Provisional scaffold default**

## Context

The user requires an append-only execution log and Box file/folder substrate. Container isolation, replay and production storage need separate decisions.

## Decision

Persist typed JSONL events with ordered sequence, run and Box IDs. Flush every append. Use an exclusive lock file for cooperating writers and refuse malformed sequences or a partial tail. Return immutable events.

Represent Boxes as local folders. Reject traversal, absolute paths and symlink components. Mount through bounded snapshot copies that never overwrite an existing destination. Use named capability adapters for agent access.

## Consequences

Runs survive process restart as readable history; mounted source files remain independent. A stale crash lock requires inspection and manual removal. JSONL is not tamper-proof and has no redaction. Local path checks remain subject to filesystem races and do not isolate hostile processes. Events alone do not implement replay/rewind or filesystem snapshots. OS sandboxing remains an explicit production decision.

## Implementation

[`event-log.ts`](../../src/ledger/event-log.ts), [`box-manager.ts`](../../src/workspace/box-manager.ts).

## Validation

`npm test`: append/reopen ordering, writer exclusion, corruption, cross-Box metadata, symlinks, traversal, bounded reads, independent mounts and rejected partial copies in `tests/event-log.test.ts` and `tests/box-manager.test.ts`.
