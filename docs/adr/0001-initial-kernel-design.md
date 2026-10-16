# 0001: Start with a standalone execution kernel

Status: **Provisional scaffold default**

## Context

The user requires separate learning and execution projects. The engine needs runtime, state/event and workspace foundations before implementing six specialized agent roles.

## Decision

Use strict TypeScript on Node.js 22 with no runtime dependencies. Implement one `Agent.step` loop, explicit named-tool allowlists, and a deterministic read-only Scout demo. Keep the learning UI independent. Role and tool capability labels describe intended policy; only the tool-name allowlist is enforced by this runner.

## Consequences

The kernel is easy to run and test without credentials. It does not yet provide a model gateway, shell executor, multi-agent scheduler, transactions, memory, or OS isolation. The user can choose those designs through later ADRs without coupling them to the learning app.

## Implementation

[`src/runtime/types.ts`](../../src/runtime/types.ts), [`runner.ts`](../../src/runtime/runner.ts), [`src/index.ts`](../../src/index.ts).

## Validation

`npm run typecheck`, `npm run build`, `npm run demo`, and the forbidden-tool test in `tests/runtime-budget.test.ts`.
