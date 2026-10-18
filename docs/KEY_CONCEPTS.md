# Key concepts

This digest records implemented boundaries and reviewed learning, not automatic milestone completion. For each newly implemented concept, add a heading followed by exactly the three labeled bullets below, linking code and verification evidence within them. Runtime M1–M5 capabilities remain planned until their contracts pass review.

## Playbook versus executable runtime

- **What it is:** `agent-architect` is the control-plane playbook for architecture, prompts, and personal learning; `agentbox-core` is the executable TypeScript runtime engine, not a UI-controlled remote service ([decision](adr/ADR-0001-portfolio-consolidation-and-runtime-architecture.md)).
- **Why we used it:** Separate learning records from runtime state and make GitHub milestone issues the delivery contracts, so UI checkmarks and design notes cannot imply verified engine capabilities ([working agreement](../AGENTS.md)).
- **Failure mode without it:** A plausible playbook, old prototype, or self-reported completion could be mistaken for implemented and independently verified behavior; source provenance and actual test receipts would lose a single reviewable home ([harvest ledger](HARVEST_LEDGER.md)).

## Review-driven delivery contract

- **What it is:** One issue follows one bounded delivery path through executable tests, a ten-line Micro-ADR, this three-bullet digest, and a Milestone Review Packet produced before committing ([workflow](../AGENTS.md)).
- **Why we used it:** Evidence, design trade-offs, and personal understanding travel with the implementation rather than remaining scattered across repositories or chat history ([ADR index](adr/README.md)).
- **Failure mode without it:** An agent may optimize for a green narrative or weakened checks instead of the requested invariant; missing negative tests, stale receipts, and unreviewed scope expansion become harder to detect.
