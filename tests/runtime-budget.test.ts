import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionBudget } from "../src/runtime/budget.js";
import { runAgent } from "../src/runtime/runner.js";
import type { Agent, BudgetLimits, StepContext } from "../src/runtime/types.js";
import { FakeClock, fixture } from "./helpers.js";

const limits: BudgetLimits = { maxSteps: 10, maxTokens: 100, timeoutMs: 1_000 };
const task = { id: "task-test", objective: "Prove bounded execution" };
function agent(step: Agent["step"], allowedTools: string[] = []): Agent {
  return { id: "test-agent", role: "scout", allowedTools, step };
}

test("an agent that never completes stops at the exact step limit", async (t) => {
  const { ledger } = fixture(t);
  let calls = 0;
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(), limits: { ...limits, maxSteps: 3 },
    agent: agent(async () => { calls++; return { done: false }; }) });
  assert.equal(result.reason, "max_steps");
  assert.equal(calls, 3);
  assert.equal(result.budget.steps, 3);
  assert.equal(ledger.readAll().filter((event) => event.type === "run_terminated").length, 1);
});

test("token reservations reject work before it can exceed the cap", async (t) => {
  const { ledger } = fixture(t);
  let admitted = 0;
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(), limits: { ...limits, maxTokens: 5 },
    agent: agent(async (context) => { context.reserveTokens(3); admitted++; return { done: false }; }) });
  assert.equal(result.reason, "max_tokens");
  assert.equal(admitted, 1);
  assert.equal(result.budget.tokensReserved, 3);
  assert.equal(result.budget.tokensRemaining, 2);
});

test("exact token exhaustion prevents the next step", async (t) => {
  const { ledger } = fixture(t);
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(), limits: { ...limits, maxTokens: 6 },
    agent: agent(async (context) => { context.reserveTokens(3); return { done: false }; }) });
  assert.equal(result.reason, "max_tokens");
  assert.equal(result.budget.steps, 2);
  assert.equal(result.budget.tokensReserved, 6);
});

test("completion on the final admitted step wins over exact step and token exhaustion", async (t) => {
  const { ledger } = fixture(t);
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(), limits: { ...limits, maxSteps: 1, maxTokens: 3 },
    agent: agent(async (context) => { context.reserveTokens(3); return { done: true, summary: "Finished" }; }) });
  assert.equal(result.reason, "completed");
  assert.equal(result.summary, "Finished");
});

test("deadline aborts the context and returns even when a step never resolves", async (t) => {
  const { ledger } = fixture(t);
  const clock = new FakeClock();
  let context: StepContext | undefined;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  const running = runAgent({ boxId: "box-test", task, ledger, clock, limits,
    agent: agent(async (value) => { context = value; started(); return new Promise(() => {}); }) });
  await ready;
  clock.advance(1_000);
  const result = await running;
  assert.equal(result.reason, "timeout");
  assert.equal(result.budget.elapsedMs, 1_000);
  assert.equal(context?.signal.aborted, true);
  assert.throws(() => context?.reserveTokens(1), /timeout/);
  assert.equal(clock.pendingTimers, 0);
});

test("caller cancellation produces one cancelled terminal event", async (t) => {
  const { ledger } = fixture(t);
  const controller = new AbortController();
  controller.abort();
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(), limits, signal: controller.signal,
    agent: agent(async () => { assert.fail("No step should start"); }) });
  assert.equal(result.reason, "cancelled");
  assert.equal(result.budget.steps, 0);
  assert.equal(ledger.readAll().filter((event) => event.type === "run_terminated").length, 1);
});

test("zero limits admit no steps and use documented exhaustion precedence", async (t) => {
  const { ledger } = fixture(t);
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(),
    limits: { maxSteps: 0, maxTokens: 0, timeoutMs: 0 },
    agent: agent(async () => { assert.fail("No step should start"); }) });
  assert.equal(result.reason, "timeout");
  assert.equal(result.budget.steps, 0);
});

test("unknown or forbidden tools fail without dispatching them", async (t) => {
  const { ledger } = fixture(t);
  let executed = false;
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(), limits,
    tools: [{ name: "write_file", capability: "write", async execute() { executed = true; return null; } }],
    agent: agent(async (context) => { await context.executeTool("write_file", "unsafe"); return { done: true }; }) });
  assert.equal(result.reason, "agent_error");
  assert.match(result.error ?? "", /not allowed/);
  assert.equal(executed, false);
  assert.equal(ledger.readAll().some((event) => event.type === "tool_called"), false);
});

test("a late tool result cannot append events after timeout", async (t) => {
  const { ledger } = fixture(t);
  const clock = new FakeClock();
  let finishTool!: (value: string) => void;
  let startTool!: () => void;
  const ready = new Promise<void>((resolve) => { startTool = resolve; });
  const running = runAgent({ boxId: "box-test", task, ledger, clock, limits,
    tools: [{ name: "slow_read", capability: "read", async execute() { startTool(); return new Promise<string>((resolve) => { finishTool = resolve; }); } }],
    agent: agent(async (context) => { await context.executeTool("slow_read", null); return { done: true }; }, ["slow_read"]) });
  await ready;
  clock.advance(1_000);
  assert.equal((await running).reason, "timeout");
  const count = ledger.readAll().length;
  finishTool("arrived too late");
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(ledger.readAll().length, count);
  assert.equal(ledger.readAll().at(-1)?.type, "run_terminated");
});

test("completed step contexts are revoked", async (t) => {
  const { ledger } = fixture(t);
  let saved!: StepContext;
  const result = await runAgent({ boxId: "box-test", task, ledger, clock: new FakeClock(), limits,
    agent: agent(async (context) => { saved = context; return { done: true }; }) });
  assert.equal(result.reason, "completed");
  assert.throws(() => saved.reserveTokens(1), /Run ended/);
  assert.equal(ledger.readAll().at(-1)?.type, "run_terminated");
});

test("invalid budgets and token reservations fail explicitly", () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new ExecutionBudget({ ...limits, maxSteps: value }), RangeError);
  }
  assert.throws(() => new ExecutionBudget({ ...limits, timeoutMs: 2_147_483_648 }), RangeError);
  const budget = new ExecutionBudget(limits, new FakeClock());
  assert.throws(() => budget.reserveTokens(-1), RangeError);
  assert.equal(budget.snapshot().tokensReserved, 0);
});
