# AgentBox Core

A standalone TypeScript execution kernel for the future AgentBox platform. It provides bounded single-agent runs, an append-only execution ledger, and local Box folders. The learning app lives separately in `../agent-architect` and has no runtime dependency on this project.

## Run locally

Requires Node.js 22 or later.

```sh
npm install
npm run demo
npm test
npm run typecheck
npm run build
npm start
```

The demo runs a deterministic read-only Scout against `workspaces/box-sample`. It lists files, reads the sample README, reserves 24 synthetic tokens, and prints its termination reason and ledger location. It makes no model calls and runs no shell commands. Repeated runs append to `.agentbox/ledgers/box-sample.jsonl` with new run IDs.

Run the sample Box's own tests separately:

```sh
npm --prefix workspaces/box-sample run test:sample
```

## Kernel layout

| Module | Responsibility |
| --- | --- |
| `src/runtime/types.ts` | Agent, Task, Tool, budget and termination contracts |
| `src/runtime/budget.ts` | Step admission, conservative token reservations, monotonic deadline |
| `src/runtime/runner.ts` | Single-agent loop, capability allowlist, abort and terminal event |
| `src/ledger/event-log.ts` | Typed JSONL events, exclusive writer lock, ordered durable appends |
| `src/workspace/box-manager.ts` | Box folders, path checks, bounded reads and snapshot-copy mounts |
| `src/index.ts` | Public exports and deterministic demo |

The role names cover the six learning archetypes, but this scaffold implements the shared kernel and one mock Scout. Supervisor scheduling, provider gateways, patch transactions, real verifiers, event actors and memory curation remain future modules.

## Execution semantics

- A step is counted immediately before calling `agent.step`. Exhaustion admits no additional step.
- Agents reserve a known token cost or conservative upper bound with `context.reserveTokens` **before** starting paid work. A reservation larger than the remaining allowance throws before changing the counter. There are no refunds in this scaffold.
- These counters track reservations, not measured provider usage. A future gateway must count input tokens, cap output tokens, and reserve both before making a call.
- A completed final step can use the last admitted step/token. It returns `completed`. An elapsed deadline wins over completion; simultaneous exhaustion uses deadline, then steps, then tokens.
- The run returns a terminal reason: `completed`, `max_steps`, `max_tokens`, `timeout`, `cancelled`, or `agent_error`. Agent errors include a message.
- The deadline aborts the supplied signal and races an unresolved async step. Contexts stop admitting tools/reservations after step completion or run termination. Tool adapters must honor the signal; JavaScript cannot forcibly stop an in-flight side effect, an infinite CPU loop, or blocked synchronous I/O.
- Tool names are explicitly allowed per agent. The role and capability labels are descriptive; they do not constitute an OS permission boundary.

The injected `Clock` makes deadline tests deterministic. They advance logical time without sleeping.

## Workspace and ledger behavior

`BoxManager.mount(boxId, sourcePath, destination?)` copies a selected file or folder into a Box. It produces an independent snapshot, rejects existing destinations and symlinks, and preflights entry/byte bounds. It is a local copy operation, not a Docker bind mount. Path traversal, absolute paths and symlink components are rejected by the manager.

These are local directory fences for cooperating code. They are subject to filesystem races and do not isolate hostile processes, arbitrary agent JavaScript, networking or resource usage. Container/micro-VM execution and hardened filesystem handles are later architecture decisions.

`EventLog` writes one immutable JSON event per line, with sequence number, Box/run IDs and timestamp. Each append is flushed before returning. A `.lock` file excludes cooperating writers. Reopening validates sequence/envelope integrity and refuses a partial final record. A crash can leave a stale lock: inspect the log and ensure its writer is gone before removing that lock manually. Records are not silently truncated or repaired.

Append-only history does not yet implement workspace snapshots, replay, rewind, tamper-proof storage or secret redaction. `file_diff` and `verification_receipt` are available event contracts; the demo does not claim to generate verified patches or receipts.

## Architecture decisions

See the [ADR index](docs/adr/README.md). The ADRs describe reversible scaffold defaults, distinguish them from user requirements, and identify the decisions that still need an architecture review. [ADR 0004](docs/adr/0004-delivery-and-decision-records.md) records the accepted repository, documentation and commit conventions; [AGENTS.md](AGENTS.md) preserves them for future changes.

## Validation

The test suite covers step/token/deadline termination, cancellation, context revocation, forbidden tools, late async results, persisted ordering, writer exclusion, corrupted records, traversal/symlink fencing and snapshot mounts. Build/typecheck checks the source and tests independently. The sample invoice tests exercise real files inside the sample Box.
