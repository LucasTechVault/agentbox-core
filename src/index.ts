import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { BoxManager } from "./workspace/box-manager.js";
import { EventLog } from "./ledger/event-log.js";
import { runAgent } from "./runtime/runner.js";
import type { Agent, Tool } from "./runtime/types.js";

export { BoxManager, WorkspaceBoundaryError } from "./workspace/box-manager.js";
export { EventLog, LedgerCorruptionError } from "./ledger/event-log.js";
export { ExecutionBudget, BudgetExceededError } from "./runtime/budget.js";
export { runAgent } from "./runtime/runner.js";
export type * from "./runtime/types.js";
export type * from "./ledger/event-log.js";
export type { TreeEntry, MountResult, MountLimits } from "./workspace/box-manager.js";

async function main(): Promise<void> {
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  const boxes = new BoxManager(resolve(projectRoot, "workspaces"));
  const boxId = "box-sample";
  boxes.boxPath(boxId);
  const ledger = new EventLog({ filePath: resolve(projectRoot, ".agentbox", "ledgers", `${boxId}.jsonl`), boxId });
  const tools: Tool[] = [
    {
      name: "list_tree", capability: "read",
      async execute(_input, { signal }) {
        signal.throwIfAborted();
        return boxes.listTree(boxId).map((entry) => ({ ...entry }));
      },
    },
    {
      name: "read_file", capability: "read",
      async execute(input, { signal }) {
        signal.throwIfAborted();
        if (typeof input !== "string") throw new TypeError("read_file expects a relative path string");
        return boxes.readFile(boxId, input);
      },
    },
  ];
  const agent: Agent = {
    id: "sample-scout", role: "scout", allowedTools: ["list_tree", "read_file"],
    async step(context) {
      context.reserveTokens(12); // Synthetic, conservative usage; no model call is made.
      if (context.step === 1) {
        const tree = await context.executeTool("list_tree", null);
        return { done: false, summary: `Inspected ${Array.isArray(tree) ? tree.length : 0} workspace entries.` };
      }
      await context.executeTool("read_file", "README.md");
      return { done: true, summary: "Sample workspace inspected. Run its deterministic tests with npm run test:sample from the workspace folder." };
    },
  };
  try {
    const result = await runAgent({ boxId, task: { id: "inspect-sample", objective: "Inspect the sample workspace using read-only capabilities." }, agent, tools,
      limits: { maxSteps: 5, maxTokens: 200, timeoutMs: 5_000 }, ledger });
    process.stdout.write(`${JSON.stringify({ ...result, ledgerPath: ledger.filePath, execution: "deterministic mock; no model/provider" }, null, 2)}\n`);
    if (result.reason !== "completed") process.exitCode = 1;
  } finally { ledger.close(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
