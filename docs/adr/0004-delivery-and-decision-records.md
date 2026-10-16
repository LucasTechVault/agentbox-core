# 0004: Publish separate repositories with concise decisions and tested commits

Status: **Accepted user requirement**

## Context

The user requested two public repositories, concise architecture decisions, and consistent commits that preserve the reasoning behind the implementation.

## Decision

Publish AgentBox Core separately from Agent Architect. Keep numbered decisions in `docs/adr/` and distinguish user requirements from provisional scaffold choices. Use `AGENTS.md` to preserve these working conventions. Make focused Conventional Commits at meaningful, tested feature boundaries and reference relevant ADRs in commit bodies. Do not schedule automatic or time-based commits.

Use GitHub Actions to install from the lockfile, typecheck, run kernel and sample tests, build and execute the compiled demo. Keep generated output, execution logs and real mounted data untracked. The package remains `private: true`; public GitHub source does not authorize npm publication.

## Consequences

Each project remains independently installable and reviewable. Decisions and validation travel with its code. Commits reflect completed work rather than elapsed time. Repository publication and npm package publication are separate actions.

## Implementation

[`AGENTS.md`](../../AGENTS.md), [`CI workflow`](../../.github/workflows/ci.yml), [`package.json`](../../package.json), [ADR index](README.md).

## Validation

The CI sample command targets `workspaces/box-sample/tests/*.test.mjs`, whose imports resolve relative to those test files. Local typecheck, kernel/sample tests, build and compiled demo pass. Remote CI is confirmed only after GitHub reports a successful run.
