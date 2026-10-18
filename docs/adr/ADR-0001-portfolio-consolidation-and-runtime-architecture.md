# ADR-0001: Portfolio consolidation and runtime architecture
Status: Accepted by the owner's Phase 2 portfolio directives.
Date: 2026-10-18.
Scope: Harvest Tripartite, PocketAgent, repo-assistant, ai_system_fundamentals, mission-control-agent-platform, distributed-execution-platform, AgentFactory, PocketAlpha, and Strata into five bounded delivery contracts; Operation_Meridian is a separately preserved draft/empty remote.
Context: Separate prototype repositories fragment architectural learning, executable evidence, and delivery status.
Decision: Keep agent-architect as the control-plane playbook and agentbox-core as the executable runtime engine, with one GitHub issue per milestone and review-gated tests, Micro-ADRs, concept digests, and delivery packets.
Rejected Alternative: Reject maintaining competing prototype runtimes or bulk-copying their design claims and defective implementations into a new monolith.
Risk: Private historical references can become inaccessible without authorized access, and copied patterns can preserve unsafe assumptions unless source revisions, local preservation, and negative tests are recorded.
Implementation: AGENTS.md, docs/HARVEST_LEDGER.md, docs/KEY_CONCEPTS.md, the preserved Operation Meridian playbook notes, and GitHub issues M1–M5 define the consolidation without claiming those runtime milestones are implemented.
Verification: Core typecheck, 24 tests, and build passed; playbook 52 tests and build passed; preservation hashes, five issue URLs, setting readbacks, verified pins, and the public-fork visibility exception are recorded in docs/reviews/2026-10-18-portfolio-consolidation.md before committing.
