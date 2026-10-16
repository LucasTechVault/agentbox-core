import { EventLog } from "../ledger/event-log.js";
import { BudgetExceededError, ExecutionBudget, systemClock } from "./budget.js";
import type { Agent, AgentStepResult, BudgetLimits, Clock, JsonValue, RunResult, StepContext, Task, TerminationReason, Tool } from "./types.js";

class RunCancelledError extends Error {
  constructor() { super("Run cancelled"); this.name = "RunCancelledError"; }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Executes one agent. Capabilities are explicit; topology and model gateways are later modules. */
export async function runAgent(options: {
  boxId: string;
  task: Task;
  agent: Agent;
  limits: BudgetLimits;
  ledger: EventLog;
  tools?: readonly Tool[];
  clock?: Clock;
  signal?: AbortSignal;
}): Promise<RunResult> {
  const { agent, ledger } = options;
  if (ledger.boxId !== options.boxId) throw new Error("Ledger box does not match run box");
  const clock = options.clock ?? systemClock;
  const budget = new ExecutionBudget(options.limits, clock);
  const limits = budget.limits;
  const allowedTools = new Set(agent.allowedTools);
  const tools = new Map<string, Tool>();
  for (const tool of options.tools ?? []) {
    if (tools.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`);
    tools.set(tool.name, tool);
  }
  const task = Object.freeze({ ...options.task });
  ledger.append("run_started", { taskId: task.id, objective: task.objective, agentId: agent.id, limits: { ...limits } });
  const controller = new AbortController();
  const cancel = () => controller.abort(new RunCancelledError());
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = clock.setTimeout(() => controller.abort(new BudgetExceededError("timeout")), Math.max(0, limits.timeoutMs - budget.elapsedMs));
  let summary: string | undefined;
  let failure: string | undefined;
  let reason: TerminationReason = "agent_error";

  try {
    while (true) {
      controller.signal.throwIfAborted();
      const step = budget.startStep();
      ledger.append("step_started", { step });
      let active = true;
      const assertActive = () => {
        controller.signal.throwIfAborted();
        if (!active) throw new Error("Step context is no longer active");
        if (budget.elapsedMs >= limits.timeoutMs) throw new BudgetExceededError("timeout");
      };
      const context: StepContext = Object.freeze({
        boxId: options.boxId,
        task,
        step,
        signal: controller.signal,
        get tokensRemaining() { return budget.tokensRemaining; },
        reserveTokens(count: number) {
          assertActive();
          budget.reserveTokens(count);
          ledger.append("tokens_reserved", { step, tokens: count, total: budget.snapshot().tokensReserved });
        },
        async executeTool(name: string, input: JsonValue): Promise<JsonValue> {
          assertActive();
          if (!allowedTools.has(name)) throw new Error(`Tool is not allowed for ${agent.id}: ${name}`);
          const tool = tools.get(name);
          if (!tool) throw new Error(`Unknown tool: ${name}`);
          ledger.append("tool_called", { step, name, input });
          try {
            const output = await tool.execute(structuredClone(input), { boxId: options.boxId, taskId: task.id, signal: controller.signal });
            assertActive();
            ledger.append("tool_succeeded", { step, name, output });
            return output;
          } catch (error) {
            if (active && !controller.signal.aborted) ledger.append("tool_failed", { step, name, error: errorMessage(error) });
            throw error;
          }
        },
      });
      let removeAbortListener = () => {};
      const interrupted = new Promise<never>((_, reject) => {
        const onAbort = () => reject(controller.signal.reason);
        controller.signal.addEventListener("abort", onAbort, { once: true });
        removeAbortListener = () => controller.signal.removeEventListener("abort", onAbort);
        if (controller.signal.aborted) onAbort();
      });
      let outcome: AgentStepResult;
      try {
        outcome = await Promise.race([Promise.resolve().then(() => { assertActive(); return agent.step(context); }), interrupted]);
        assertActive();
      } finally {
        active = false;
        removeAbortListener();
      }
      if (!outcome || typeof outcome.done !== "boolean" || (outcome.summary !== undefined && typeof outcome.summary !== "string")) {
        throw new Error("Agent returned an invalid step result");
      }
      ledger.append("step_completed", { step, done: outcome.done, ...(outcome.summary === undefined ? {} : { summary: outcome.summary }) });
      summary = outcome.summary ?? summary;
      // Synchronous ledger I/O can also consume the remaining deadline.
      controller.signal.throwIfAborted();
      if (budget.elapsedMs >= limits.timeoutMs) throw new BudgetExceededError("timeout");
      // A completed final step wins over exact step/token exhaustion. Deadlines have already been checked.
      if (outcome.done) { reason = "completed"; break; }
    }
  } catch (error) {
    if (error instanceof BudgetExceededError) reason = error.reason;
    else if (error instanceof RunCancelledError) reason = "cancelled";
    else { reason = "agent_error"; failure = errorMessage(error); }
  } finally {
    clock.clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
    // Revoke every context, including detached tasks from already completed steps.
    if (!controller.signal.aborted) controller.abort(new Error("Run ended"));
  }
  const result: RunResult = {
    runId: ledger.runId,
    reason,
    budget: budget.snapshot(),
    ...(summary === undefined ? {} : { summary }),
    ...(failure === undefined ? {} : { error: failure }),
  };
  ledger.append("run_terminated", { reason, budget: result.budget, ...(summary === undefined ? {} : { summary }), ...(failure === undefined ? {} : { error: failure }) });
  return result;
}
