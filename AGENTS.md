# Working in AgentBox Core

This is the standalone execution engine. Learning UI and learner progress belong in agent-architect.

- Run `npm run typecheck`, `npm test`, and `npm run build` before committing. Run sample tests and the demo when relevant.
- Record consequential design changes in concise, numbered `docs/adr/` records: context, decision, consequence, implementation, verification. Maintain the index and distinguish provisional defaults from approved architecture.
- Make focused commits at meaningful, tested checkpoints. Use `feat:`, `fix:`, `test:`, `docs:`, or `chore:` with concrete outcomes; reference ADR IDs in commit bodies. No empty or time-based commits.
- Review staged files and diffs. Keep credentials, execution logs, real mounted files, node_modules, and generated output out of this public repository. Track only synthetic sample data.
- Do not describe path fencing as OS isolation or cooperative abort as forced termination. New adapters must preserve explicit budgets and capability boundaries.
- Preserve user changes. Push completed requested work to origin when authorized by the session. Never force-push or rewrite published history without explicit authorization.
