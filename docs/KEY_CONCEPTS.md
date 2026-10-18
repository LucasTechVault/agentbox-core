# Key Concepts Digest

This living digest records implemented architectural mechanisms and their verified trade-offs across our M0–M5 curriculum ([`CURRICULUM_TRACKER.md`](CURRICULUM_TRACKER.md)). Every implemented concept uses our mandatory 3-bullet format (**What it is**, **Why we used it**, **Failure mode without it**) linked directly to executable source and test files.

---

## M0: Kernel Foundation (Live & Verified)

### 1. Playbook vs. Runtime Separation

- **What it is:** A strict repository and process boundary separating `agent-architect` (the React/TypeScript architectural playbook, specification vault, and personal progress tracker) from `agentbox-core` (the zero-UI Node.js/TypeScript execution kernel) ([`ADR-0001`](adr/ADR-0001-bottom-up-runtime-and-topology-curriculum.md), [`src/index.ts`](../src/index.ts)).
- **Why we used it:** Keeps learning specifications, design rubrics, and UI state completely decoupled from runtime execution state, ensuring that checking a box in the UI never fabricates or implies an unverified engine capability ([`AGENTS.md`](../AGENTS.md)).
- **Failure mode without it:** Architectural diagrams, prompt drafts, or UI progress toggles get conflated with working runtime enforcement, hiding missing safety checks and untestable coupling between browser state and filesystem/process execution.

### 2. Pre-Work Budget Admission & Injectable Clock

- **What it is:** An admission controller ([`ExecutionBudget`](../src/runtime/budget.ts#L17-L76) in [`src/runtime/budget.ts`](../src/runtime/budget.ts)) that validates non-negative safe-integer limits, increments step counts *before* dispatch, reserves conservative token upper bounds *before* paid work begins, and evaluates deadlines against an injected monotonic [`Clock`](../src/runtime/types.ts#L26-L30) with deterministic exhaustion precedence (`timeout` → `max_steps` → `max_tokens`) ([`tests/runtime-budget.test.ts`](../tests/runtime-budget.test.ts#L14-L90)).
- **Why we used it:** Turns resource limits into a pre-execution admission gate rather than a post-hoc billing counter, while the injectable [`FakeClock`](../tests/helpers.ts) lets tests verify exact deadline races and timeout precedence in milliseconds without flaky `sleep()` calls ([`tests/runtime-budget.test.ts`](../tests/runtime-budget.test.ts#L53-L69)).
- **Failure mode without it:** Agents overspend token and step caps on in-flight requests or retry storms before noticing exhaustion, `setTimeout` integer overflow (`> 2,147,483,647` ms) silently collapses into a 1 ms immediate timeout in Node.js, and time-based unit tests become slow and non-deterministic.

### 3. Step Context Revocation

- **What it is:** A per-step lifecycle guard inside [`runAgent`](../src/runtime/runner.ts#L47-L120) ([`src/runtime/runner.ts`](../src/runtime/runner.ts)) that races `agent.step(context)` against an `AbortController` deadline/cancellation signal and flips `active = false` in a `finally` block so [`StepContext.reserveTokens`](../src/runtime/runner.ts#L63-L67) and [`StepContext.executeTool`](../src/runtime/runner.ts#L68-L83) immediately throw once a step completes or a run terminates ([`tests/runtime-budget.test.ts`](../tests/runtime-budget.test.ts#L103-L130)).
- **Why we used it:** JavaScript `Promise.race` returns control to the runner on timeout but cannot forcibly kill a detached async Promise held by a slow tool or model adapter; revoking the [`StepContext`](../src/runtime/types.ts#L52-L61) guarantees that late-resolving work is fenced off from mutating budget counters or appending events.
- **Failure mode without it:** A timed-out or cancelled tool call finishes in the background after `run_terminated` is written and appends zombie `tool_succeeded` or `tokens_reserved` records to the ledger, corrupting causal history and post-run state replay.

### 4. Single-Writer Append-Only JSONL Ledger

- **What it is:** A durable local event store ([`EventLog`](../src/ledger/event-log.ts#L103-L219) in [`src/ledger/event-log.ts`](../src/ledger/event-log.ts)) that acquires an exclusive `.lock` file (`O_CREAT | O_EXCL` via `"wx"`), validates acyclic plain-JSON payloads against event schemas, loops `writeSync` until every byte is written, flushes via `fsyncSync`, deep-freezes returned [`ExecutionEvent`](../src/ledger/event-log.ts#L24-L32) objects, and fails closed with [`LedgerCorruptionError`](../src/ledger/event-log.ts#L95-L100) on partial tail records or sequence gaps ([`tests/event-log.test.ts`](../tests/event-log.test.ts#L15-L91)).
- **Why we used it:** Establishes an immutable, globally ordered sequence of facts (`sequence: 1..N`) per Box so downstream state reducers (M1) and trajectory graders (M5) can rely on crash-flushed, schema-verified event history.
- **Failure mode without it:** Concurrent processes interleave partial JSON lines, unawaited writes vanish on process crash, callers accidentally mutate in-memory event payloads after persistence, or reopening a truncated log silently skips corrupted records and fabricates a false state projection.

### 5. Application Path Fencing & Atomic Copy-In Mounts

- **What it is:** A workspace boundary manager ([`BoxManager`](../src/workspace/box-manager.ts#L36-L193) in [`src/workspace/box-manager.ts`](../src/workspace/box-manager.ts)) that validates Box IDs, walks every path segment with `lstatSync` and `O_NOFOLLOW` to reject parent traversal (`..`), absolute/Windows paths, and symlinks, writes files via temporary-file + `renameSync`, and mounts external inputs via preflight-bounded (`maxEntries`, `maxBytes`) atomic `snapshot-copy` ([`tests/box-manager.test.ts`](../tests/box-manager.test.ts#L17-L84)).
- **Why we used it:** Confines cooperating file and search tools to a Box's directory tree and isolates mounted project snapshots so agent edits inside a Box never mutate the user's original source folder or leave half-copied trees on error.
- **Failure mode without it:** A relative path like `../../etc/passwd` or an internal symlink escapes the Box root to read or overwrite host files, failed mid-stream mounts leave partial corrupted directories in the workspace, or live bind mounts allow a buggy agent step to destroy the user's host repository.
