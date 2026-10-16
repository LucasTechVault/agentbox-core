export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface BudgetLimits {
  maxSteps: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface BudgetSnapshot {
  steps: number;
  tokensReserved: number;
  elapsedMs: number;
  stepsRemaining: number;
  tokensRemaining: number;
}

export type TerminationReason =
  | "completed"
  | "max_steps"
  | "max_tokens"
  | "timeout"
  | "cancelled"
  | "agent_error";

/** A monotonic clock. Timers are injectable so deadline tests never need to sleep. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface Task {
  id: string;
  objective: string;
}

export type AgentRole = "orchestrator" | "scout" | "builder" | "verifier" | "sentinel" | "curator";
export type ToolCapability = "read" | "write" | "verify" | "coordinate";

export interface ToolContext {
  readonly boxId: string;
  readonly taskId: string;
  readonly signal: AbortSignal;
}

export interface Tool {
  readonly name: string;
  readonly capability: ToolCapability;
  execute(input: JsonValue, context: ToolContext): Promise<JsonValue>;
}

export interface StepContext {
  readonly boxId: string;
  readonly task: Readonly<Task>;
  readonly step: number;
  readonly signal: AbortSignal;
  readonly tokensRemaining: number;
  /** Reserve a known cost or an upper bound BEFORE starting paid work. Reservations are conservative. */
  reserveTokens(count: number): void;
  executeTool(name: string, input: JsonValue): Promise<JsonValue>;
}

export interface AgentStepResult {
  done: boolean;
  summary?: string;
}

export interface Agent {
  readonly id: string;
  readonly role: AgentRole;
  /** Explicit allowlist. A role label by itself grants no capabilities. */
  readonly allowedTools: readonly string[];
  step(context: StepContext): Promise<AgentStepResult>;
}

export interface RunResult {
  runId: string;
  reason: TerminationReason;
  budget: BudgetSnapshot;
  summary?: string;
  error?: string;
}
