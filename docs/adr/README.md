# Architecture decision records

ADRs record implemented behavior and its trade-offs. Records 0001–0003 document the initial M0 kernel scaffold; record 0004 captures repository and commit conventions. Keep accepted records stable and supersede them with a new numbered ADR when a decision changes.

| Record | Status | Decision |
| --- | --- | --- |
| [0001](0001-initial-kernel-design.md) | Provisional (M0) | Standalone TypeScript single-agent kernel |
| [0002](0002-budget-and-termination.md) | Provisional (M0) | Admit bounded steps and reserve tokens before work |
| [0003](0003-ledger-and-workspace-boundaries.md) | Provisional (M0) | JSONL single-writer ledger and snapshot-copy Box folders |
| [0004](0004-delivery-and-decision-records.md) | Accepted | Separate public repositories, concise ADRs and tested Conventional Commits |

## Curriculum & Milestone Micro-ADRs (`ADR-XXXX`)

Every milestone checkpoint adds a strict 10-line Micro-ADR using the `ADR-XXXX-<slug>.md` naming convention defined in [`AGENTS.md`](../../AGENTS.md).

| Record | Status | Decision |
| --- | --- | --- |
| [ADR-0001](ADR-0001-bottom-up-runtime-and-topology-curriculum.md) | Accepted | Bottom-up M0–M5 curriculum sequencing Event-Driven Ledger (M1) before Workflow vs. Autonomous ReAct (M2), Graph (M3), A2A (M4), and Eval Gate (M5) |
