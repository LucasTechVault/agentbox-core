# Prototype Harvest Ledger

This ledger records reference material for the approved portfolio consolidation.
`agent-architect` is the architecture playbook and prompt hub;
`agentbox-core` is the executable TypeScript runtime. The nine source repositories
are references, not dependencies or additional active runtime projects.

## Delivery contracts

These issues are open assignment contracts, not completed runtime features:

| Milestone | Canonical GitHub issue |
| --- | --- |
| M1 | [State Management, Append-Only Event Log & Revision-Checked Snapshots](https://github.com/LucasTechVault/agentbox-core/issues/1) |
| M2 | [Context Engine, Repo Indexing & Retrieval Cache](https://github.com/LucasTechVault/agentbox-core/issues/2) |
| M3 | [Bounded Execution, Tool Authorization Pipeline & Scoped Sandbox](https://github.com/LucasTechVault/agentbox-core/issues/3) |
| M4 | [Multi-Agent Topologies, Role Permissions & DAG Orchestration](https://github.com/LucasTechVault/agentbox-core/issues/4) |
| M5 | [Trajectory Graders, Mutation Fixtures & Adversarial Eval Gate](https://github.com/LucasTechVault/agentbox-core/issues/5) |

The source inventory was inspected on 18 October 2026. A GitHub link identifies a
specific audited commit; a local path is listed only when the checkout was
verified. A missing local path means **not located in the accessible inventory**,
not that no copy exists. Archived private sources require the owner's GitHub
access. Do not make a source public to follow a link.

## Reference directory and provenance

| Source | Audited GitHub commit | Verified local checkout | Evidence boundary |
| --- | --- | --- | --- |
| Tripartite | [`5fc7d3ffbf197277b93bf701e891c6f90bf9c1cd`](https://github.com/LucasTechVault/Tripartite/tree/5fc7d3ffbf197277b93bf701e891c6f90bf9c1cd) | Not located; use the private remote reference. | State snapshots, JSONL events, tools, roles, and graders exist. Role definitions do not establish a completed three-agent orchestrator. |
| PocketAgent | [`48212776ece044bc5ff0abf5e6840fcad231692f`](https://github.com/LucasTechVault/PocketAgent/tree/48212776ece044bc5ff0abf5e6840fcad231692f) | Not located; use the private remote reference. | Reducers, budget contracts, control loop, and controlled tool execution exist; a complete OS sandbox is not established. |
| repo-assistant | [`ad958f27805f9c916aa352c595c60dce8f885c25`](https://github.com/LucasTechVault/repo-assistant/tree/ad958f27805f9c916aa352c595c60dce8f885c25) | `/Users/lucasleow/Documents/Agentic Engineering/AI_Systems_Design/AISystemsLearningProjects/repo-repair-assistant` | Contracts, reducer, CLI scaffolding, and broken-repository fixture exist. The context engine and indexing layout are design material. |
| ai_system_fundamentals | [`e364d6a2df6f1538e28c306e592b5d0785170435`](https://github.com/LucasTechVault/ai_system_fundamentals/tree/e364d6a2df6f1538e28c306e592b5d0785170435); local preservation commit `e337da44a4775c91e10a2700ef39907948067614` | `/Users/lucasleow/Documents/Agentic Engineering/AI_Systems_Design/AISystemsLearningProjects` | QueryTrail has concrete synthetic data and answer fixtures. The local folder itself is this repository; there is no extra `ai_system_fundamentals/` directory. |
| mission-control-agent-platform | [`14abbc1560b0165cca29f4593b4f73a4be1a9ad0`](https://github.com/LucasTechVault/mission-control-agent-platform/tree/14abbc1560b0165cca29f4593b4f73a4be1a9ad0) | Not located; use the private remote reference. | Registered tools, typed calls/results, timeout/cancellation handling, and a manual agent loop exist. General multi-agent DAG orchestration remains new work. |
| distributed-execution-platform | [`b4549b19c3dc8200aa3853f2fac2e81e7f15c893`](https://github.com/LucasTechVault/distributed-execution-platform/tree/b4549b19c3dc8200aa3853f2fac2e81e7f15c893) | Not located; use the private remote reference. | Durable job/queue/worker architecture is proposed in the README; the Go entry point is a bootstrap. Idempotency, outbox, retries, and distributed cancellation are design requirements, not verified implementations. |
| AgentFactory | [`24791bd39274d694cadfbb088727fa1028141da5`](https://github.com/LucasTechVault/AgentFactory/tree/24791bd39274d694cadfbb088727fa1028141da5) | Not located; use the private remote reference. | M03 local document execution, resource/specification snapshots, approval pauses, artifacts, and telemetry exist. Its event/evaluation limitations below must not be inherited. |
| PocketAlpha | [`d34967ba6bd13e9476af3af29b19daf72f9705fb`](https://github.com/LucasTechVault/PocketAlpha/tree/d34967ba6bd13e9476af3af29b19daf72f9705fb) | Not located; use the private remote reference. | M00 bootstrap only: API/database readiness, configuration, logs, and tracing-provider hooks. Agent runtime, context, replay, and scenario evaluation are planned. |
| Strata | [`f8b336d5a555eeedc14fb2fee38996bd5955e5fb`](https://github.com/LucasTechVault/Strata/tree/f8b336d5a555eeedc14fb2fee38996bd5955e5fb) | Not located; use the private remote reference. | Domain models/state transitions, PostgreSQL repositories, structured-output repair, and model-call telemetry exist. Researcher/Validator agents and the advertised complete CLI workflow are not established by the committed tree. |

Local checkouts may contain additional work. Before reading a source for a
milestone, record its actual `HEAD` and inspect its status; do not reset it to the
audited commit. Keep source changes and private business material out of a public
implementation PR. Port reviewed concepts and synthetic fixtures, not whole
applications or deployment stacks.

## Milestone harvest map

Paths below are relative to the corresponding source repository. **Implemented**
means source code or fixtures were present, not that this consolidation executed
their test suites. **Design** and **defect fixture** are explicitly separate from
reusable implementation.

| Milestone | Exact source files | Concept and proposed use | Tests or fixtures to inspect; limitations |
| --- | --- | --- | --- |
| **M1 — State, append-only events, revision-checked snapshots** | Tripartite: `tripartite/runtime/state.py`, `tripartite/runtime/events.py`, `tripartite/runtime/runtime.py` | **Implemented:** immutable task-state transitions, revision fields, local snapshot persistence, JSONL event append. Re-express these as typed TypeScript state transitions and a versioned event envelope. | `tests/test_state.py`, `tests/test_events.py`, `tests/test_runtime.py`; `tripartite/evals/mutations.py` contains the overwriting-event-store mutation. Full deterministic replay, single-writer exclusion, interrupted append, and crash-consistent replay must be delivered and tested in M1, not assumed from the prototype. |
| **M1** | PocketAgent: `src/pocketagent/runtime/state/state.py`, `src/pocketagent/runtime/state/patch.py`, `src/pocketagent/runtime/state/reducer.py`; repo-assistant: `src/repo_repair/agent/contracts.py`, `src/repo_repair/agent/state.py` | **Implemented:** explicit append/upsert/remove semantics, side-effect-free reducer, identity and call/result correlation invariants. Define expected revision independently from schema version. | PocketAgent `tests/unit/runtime/test_reducer.py`, `tests/unit/runtime/test_contracts.py`; repo-assistant `tests/agent/test_state.py`, `tests/agent/test_contract.py`. Re-derive outstanding-call invariants: repo-assistant's source counts calls against finish actions, so it is a review target rather than an authoritative specification. |
| **M1** | AgentFactory: `apps/api/app/models/entities.py`, `apps/api/app/services/run_events.py`, `packages/contracts/src/index.ts` | **Implemented:** immutable run specification/resource snapshots and ordered evidence records. Adopt snapshot identity/content hashes. **Defect fixture:** event sequence allocation uses `max(sequence)+1`; the ORM permits cascading event deletion. | Add new TypeScript tests for duplicate/stale writes, rejection of a cooperating second writer, interrupted append, replay equality, and event-history overwrite rejection. Multi-writer ordering is outside M1. Do not copy the prototype allocation/deletion semantics as an append-only guarantee. |
| **M1 / M4** | distributed-execution-platform: `README.md`, `cmd/foundry-api/main.go`; source issues [#12](https://github.com/LucasTechVault/distributed-execution-platform/issues/12) through [#20](https://github.com/LucasTechVault/distributed-execution-platform/issues/20) (design backlog; inspect each issue before adoption) | **Design:** durable jobs, queue/worker separation, retries, cancellation, idempotent delivery, and transactional outbox requirements. Use only as architectural motivation for explicit delivery semantics. The Go entry point is a print-only bootstrap. | No outbox/idempotency/retry fixture implementation was located in the audited default-branch tree. Create synthetic duplicate-delivery, crash-window, bounded-retry, and cancellation fixtures in agentbox-core. Avoid promising exactly-once external effects. |
| **M2 — Context engine, indexing, retrieval cache** | repo-assistant: `High_Level_System_Architecture.md`; Tripartite: `tripartite/agent/context.py`, `tripartite/workspace.py` | **Design:** separate repository context, prompt compilation, token budgeting, and model gateway. **Implemented reference:** Tripartite's context/workspace entry points. Build a bounded context manifest and index/cache with invalidation provenance in TypeScript. | The architecture document's target `src/repo_repair/context/` layout is a proposal, not a shipped context engine. Test deterministic selection/order, token budget, stale content hashes, branch/revision changes, excluded paths, and untrusted source instructions. |
| **M2 / M5** | ai_system_fundamentals: `querytrail/src/querytrail/fixtures/employees/README.md`, `querytrail/src/querytrail/fixtures/employees/seed.sql`, `querytrail/src/querytrail/fixtures/employees/reference_queries.json`; `querytrail/datasets/chinook/provenance.json`, `querytrail/datasets/chinook/LICENSE.md` | **Implemented synthetic fixtures:** empty departments, duplicate names, salary ties, NULL managers, explicitly ordered expected answers, and instruction-like text inside a data field. Adapt these adversarial data properties to retrieval/evaluation cases without exposing reference answers to the agent under test. | There are six employee reference questions. Keep fixture seed/input material separate from grader-owned answers. Chinook is third-party data: preserve its provenance/license if used; do not treat the repository's absence of a root license as permission to discard dataset notices. |
| **M3 — Execution bounds and authorization** | PocketAgent: `src/pocketagent/runtime/tools/registry.py`, `src/pocketagent/runtime/tools/executor.py`, `src/pocketagent/runtime/tools/gate/base.py`, `src/pocketagent/runtime/tools/gate/read_only.py`, `src/pocketagent/runtime/tools/repository/workspace.py`, `src/pocketagent/runtime/tools/repository/tools.py`; `src/pocketagent/runtime/contracts/budget.py`; `src/pocketagent/runtime/loop.py` | **Implemented:** proposal → registry lookup → action gate → argument validation → deterministic tool execution → normalized receipt; workspace constraints and turn/budget contracts. Adopt host-owned authorization and validate before side effects. | `tests/unit/runtime/test_contracts.py`, `examples/m03_tool_runtime_smoke.py`, `examples/m03_repo_agent_smoke.py`. Add TypeScript traversal/symlink, malformed/unknown tool, denied capability, budget exhaustion, timeout, and output-size fixtures. Path fencing is not OS isolation. |
| **M3 / M4** | mission-control-agent-platform: `src/mission_control/tools/contracts.py`, `src/mission_control/tools/executor.py`, `src/mission_control/tools/registry.py`, `src/mission_control/tools/schema.py`; `src/mission_control/agent/loop.py`; `docs/architecture/m03_agent_control_loop.md` | **Implemented:** correlated tool calls, allowlist/schema boundary, normalized timeout result, cancellation as control flow, manual loop. **Design:** DAG/checkpoint work remains in source issues #29–#38. Use correlation IDs for independently schedulable tasks while retaining host-owned budgets. | `tests/unit/tools/test_executor.py`, `tests/unit/tools/test_contracts.py`, `tests/unit/tools/test_registry.py`; `tests/unit/agent/test_manual_loop.py`. `src/mission_control/agent/state.py` is unfinished/not integrated and `tests/unit/agent/test_state.py` is empty. Coroutine timeout/cooperative cancellation does not prove hard termination of external work; a test filename alone is not a receipt. |
| **M3 / M1** | AgentFactory: `apps/api/app/services/local_execution.py`, `apps/api/app/services/resources.py`, `apps/api/app/services/artifacts.py`; `apps/api/app/models/entities.py` | **Implemented:** wait/resume on resource-read approval, cancellation checks, resource snapshots/content hashes, controlled artifact output and evidence manifests. Adapt capabilities to run/task/resource identity; expired or changed grants must not authorize a new operation. | `agentic/evals/M03-local-model-execution.md`, `agentic/specs/M03-local-model-execution.md`. Add executable approval-denial/revocation, changed-resource, stale-snapshot, cancellation, and artifact-path fixtures. A citation marker or successful tool receipt is not proof of grounding or atomic external effects. |
| **M3 / M5** | PocketAlpha: `src/pocketalpha/api/app.py`, `src/pocketalpha/database.py`, `src/pocketalpha/observability.py`; `scripts/smoke_api.py`, `scripts/smoke_db.py`, `scripts/smoke_model.py`; `docs/M00/verification.md` | **Implemented:** separate liveness/readiness, JSON log records with optional run ID, application-owned tracing lifecycle, independently testable model transport. Use as harness/diagnostic patterns without importing PostgreSQL into the minimal runtime. | `tests/unit/test_observability.py`, `tests/integration/test_api.py`, `tests/integration/test_database.py`; `.github/workflows/ci.yml`. Tracing is a provider hook, not a completed exporter/collector or runtime span schema. Avoid making live-model connectivity a prerequisite for deterministic unit tests. |
| **M4 — Topologies, role permissions, DAGs** | Tripartite: `tripartite/roles.py`, `tripartite/tools/runtime.py`, `tripartite/agent/runtime.py`, `specs/M00-spec.md`, `specs/M01-spec.md`; mission-control: `docs/architecture/m03_agent_control_loop.md` | **Implemented:** distinct role capabilities, mutation permission checks, explicit context policies and a single Coding-agent loop. **Design:** map planner/executor/verifier responsibilities into a validated DAG with an explicit scheduler, independent verification, and parent/child correlations. Tripartite's M01 spec explicitly defers crash resume and multi-agent activation. | Tripartite `tests/test_roles.py`, `tests/test_m01_tools.py`, `tests/test_m01_run_command.py`; mutation B in `tripartite/evals/mutations.py`. Do not present role registration as an already implemented multi-agent scheduler. Add cycle/missing-dependency rejection, bounded fan-out, permission inheritance, cancellation, and failed-dependency tests. |
| **M1 / M5** | Strata: `src/strata/domain/models.py`, `src/strata/domain/states.py`; `src/strata/llm/structured.py`, `src/strata/llm/telemetry.py`; `src/strata/persistence/repositories.py` | **Implemented:** immutable domain boundaries, explicit allowed transitions, schema validation with a bounded repair loop, one telemetry record per model attempt, isolated persistence of failed attempts. Adapt the contracts and failure accounting; keep the research product outside core. | `tests/unit/test_domain_states.py`, `tests/unit/test_llm_structured.py`, `tests/integration/test_repositories.py`. Test invalid state transitions and failed/repaired responses as new TypeScript cases. The source declares `Proprietary` in `pyproject.toml`; review ownership/notices before copying code into the public runtime. |
| **M5 — Trajectory graders and adversarial gate** | Tripartite: `tripartite/evals/base.py`, `tripartite/evals/deterministic.py`, `tripartite/evals/trajectory.py`, `tripartite/evals/mutations.py`, `tripartite/evals/runner.py` | **Implemented:** separate outcome and trajectory checks, machine-readable results, deliberately broken grader fixtures. Reproduce the principle that a grader must demonstrably reject a known bad run, and gate delivery on both outcome and trace evidence. | `tests/test_evals.py`, `tests/test_m01_mutation_tools.py`; mutations A–E cover missing entry point, forbidden mutation, overwritten event history, bypassed validation, and a lying success exit code. Keep evaluator code/answers outside candidate write scopes. |
| **M5** | repo-assistant: `examples/broken-python-api/src/broken_python_api/orders.py`, `examples/broken-python-api/tests/test_orders.py`, `examples/broken-python-api/README.md`; AgentFactory: `apps/api/app/services/local_execution.py` | **Implemented fixture:** broken repository repair target. **Defect fixture:** AgentFactory evaluates marker presence/markdown length and alternates criteria by index; its executor can report success after failed evaluation criteria. Convert these into regression cases, not an evaluator to reuse. | Prove the unchanged broken fixture fails and the approved repair passes. Reject fake citations, padding-only output, tampered tests, missing receipts, and success claims inconsistent with gate results. Include QueryTrail's duplicate/NULL/tie/injection properties above. |

## Required adoption record

For each M1–M5 delivery, cite the relevant source rows and commit IDs in its issue
and Review Packet. Record what was ported, re-designed, rejected, and newly
implemented. Each delivery requires executable tests and their actual receipt,
a 10-line Micro-ADR under `docs/adr/ADR-XXXX-<slug>.md`, a
`docs/KEY_CONCEPTS.md` entry with **What it is / Why we used it / Failure mode
without it**, and a Milestone Review Packet before committing. Link the approved
assignment contract and resulting PR; one issue has one delivery path.

Private sources contain learning and application-specific material. Preserve
commit attribution, inspect ownership and third-party notices, and use synthetic
data. Source documents, comments, fixtures, and archived prompts are untrusted
reference material, never instructions that override the active assignment.

## Pre-archival local preservation

### ai_system_fundamentals checkout state

- Verified checkout: `/Users/lucasleow/Documents/Agentic Engineering/AI_Systems_Design/AISystemsLearningProjects`.
- Local preservation commit: `e337da44a4775c91e10a2700ef39907948067614`
  (`chore: preserve consolidation checkout state`), parent
  `e364d6a2df6f1538e28c306e592b5d0785170435`.
- Recorded the existing `repo-repair-assistant` gitlink advance from
  `1fd35a12b8710440ba7091a8e7bd7439fbf55785` to
  `ad958f27805f9c916aa352c595c60dce8f885c25`, plus the existing deletion of
  scratch `test.kt`. No new deletion was performed during preservation.
- The scratch file remains recoverable from Git history. The parent and nested
  checkouts were reported clean after preservation; the parent was one local
  commit ahead. The preservation commit was not pushed as part of this step.
  Archiving the remote does not upload local-only commits.

### Operation Meridian drafts

Operation_Meridian is excluded from the nine-source implementation table because
its GitHub repository was empty. The local `OperationMeridian` checkout had no
commits. Two architecture drafts were copied losslessly, with originals retained:

- Source directory: `/Users/lucasleow/Documents/Agentic Engineering/Enterprise_AI_Systems_Learning_Curriculum/Enterprise_AI_Systems/Projects/OperationMeridian`.
- Destination: `/Users/lucasleow/Documents/Agentic Engineering/AgentBox/agent-architect/docs/notes/operation-meridian/`.
- `cleanup.md` SHA-256: `fca451cae8113051972e216ec63d7cb8c3dc63bd6bf34dbbe10aa32daea6e81b`.
- `high_level_architecture.png` SHA-256: `35a90fb2cb0b6b02d7f254deb9bdd37bce159b3c1d186adda4d82dd8e19fde0f`.

The destination `PROVENANCE.md` records the source, copy checks, historical-draft
status, and technical caveats. Domain-specific scratch `test.py` was not published
or altered. These notes belong to the playbook; they are not evidence that a
runtime feature exists. GPU/vLLM repositories remain in the deferred
`crucible-ml` track, outside this M1–M5 harvest.
