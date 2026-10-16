# Architecture decision records

ADRs record implemented behavior and its trade-offs. Records 0001–0003 are **provisional scaffold defaults**; they do not imply the user approved these choices as production architecture. Record 0004 captures the user's explicit delivery requirements. Keep accepted records stable and supersede them with a new numbered ADR when a decision changes.

| Record | Status | Decision |
| --- | --- | --- |
| [0001](0001-initial-kernel-design.md) | Provisional | Standalone TypeScript single-agent kernel |
| [0002](0002-budget-and-termination.md) | Provisional | Admit bounded steps and reserve tokens before work |
| [0003](0003-ledger-and-workspace-boundaries.md) | Provisional | JSONL single-writer ledger and snapshot-copy Box folders |
| [0004](0004-delivery-and-decision-records.md) | Accepted | Separate public repositories, concise ADRs and tested Conventional Commits |
