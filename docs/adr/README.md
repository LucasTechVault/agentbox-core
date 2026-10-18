# Architecture decision records

ADRs record implemented behavior and its trade-offs. Records 0001–0003 are **provisional scaffold defaults**; they do not imply the user approved these choices as production architecture. Record 0004 captures the user's explicit delivery requirements. Keep accepted records stable and supersede them with a new numbered ADR when a decision changes.

| Record | Status | Decision |
| --- | --- | --- |
| [0001](0001-initial-kernel-design.md) | Provisional | Standalone TypeScript single-agent kernel |
| [0002](0002-budget-and-termination.md) | Provisional | Admit bounded steps and reserve tokens before work |
| [0003](0003-ledger-and-workspace-boundaries.md) | Provisional | JSONL single-writer ledger and snapshot-copy Box folders |
| [0004](0004-delivery-and-decision-records.md) | Accepted | Separate public repositories, concise ADRs and tested Conventional Commits |

## Review-driven Micro-ADRs

The owner explicitly requested the `ADR-XXXX-<slug>.md` naming convention for the consolidation. This prefixed series starts at `ADR-0001`; it does not overwrite or renumber legacy records `0001`–`0004`. Future Micro-ADRs use the next unused prefixed ID and the ten-line format in `AGENTS.md`.

| Record | Status | Decision |
| --- | --- | --- |
| [ADR-0001](ADR-0001-portfolio-consolidation-and-runtime-architecture.md) | Accepted by owner | Two flagships, nine prototype references, five bounded issue contracts, and review-driven delivery |
