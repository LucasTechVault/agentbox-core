# ADR-0001: Bottom-up runtime and topology curriculum sequence
Status: Accepted by owner for clean-slate M0–M5 synchronization.
Date: 2026-10-18.
Scope: Sequence M0–M5 across agentbox-core and agent-architect without external prototype dependencies.
Context: Building multi-agent topologies or autonomous loops before establishing deterministic state projection and event-driven replay makes failures non-reproducible and hides state races.
Decision: Sequence the curriculum bottom-up from M0 (Kernel Foundation) to M1 (Event-Driven / Ledger Runtime), M2 (Deterministic Workflow vs. Autonomous ReAct Topologies), M3 (Graph / State-Machine Runtime), M4 (A2A Protocol Runtime), and M5 (Adversarial Eval Gate).
Rejected Alternative: Reject building autonomous ReAct agents or multi-agent A2A orchestration first on top of ad-hoc in-memory state without an event-sourced reducer and snapshot boundary.
Risk: Deferring model-routed ReAct loops until M2 delays interactive agent demos by one milestone in exchange for deterministic state and replay guarantees in M1.
Implementation: AGENTS.md, docs/CURRICULUM_TRACKER.md, docs/KEY_CONCEPTS.md, and synchronized roadmap/spec definitions in agent-architect/src/data/.
Verification: Core npm test (24/24), npm run typecheck, and npm run build pass; Playbook npm test (52/52), npm run typecheck, and npm run build pass.
