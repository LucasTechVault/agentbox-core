import {
  closeSync, constants, existsSync, fstatSync, fsyncSync, mkdirSync, openSync,
  readFileSync, unlinkSync, writeSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { BudgetLimits, BudgetSnapshot, JsonValue, TerminationReason } from "../runtime/types.js";

export interface EventPayloads {
  run_started: { taskId: string; objective: string; agentId: string; limits: BudgetLimits };
  step_started: { step: number };
  tokens_reserved: { step: number; tokens: number; total: number };
  tool_called: { step: number; name: string; input: JsonValue };
  tool_succeeded: { step: number; name: string; output: JsonValue };
  tool_failed: { step: number; name: string; error: string };
  step_completed: { step: number; done: boolean; summary?: string };
  file_diff: { path: string; before: string | null; after: string | null };
  verification_receipt: { verdict: "APPROVED" | "REJECTED"; checks: string[] };
  checkpoint: { label: string };
  run_terminated: { reason: TerminationReason; budget: BudgetSnapshot; summary?: string; error?: string };
}

export type EventType = keyof EventPayloads;
export type ExecutionEvent<K extends EventType = EventType> = K extends EventType ? {
  sequence: number;
  id: string;
  boxId: string;
  runId: string;
  at: string;
  type: K;
  payload: EventPayloads[K];
} : never;

const eventTypes = new Set<EventType>([
  "run_started", "step_started", "tokens_reserved", "tool_called", "tool_succeeded", "tool_failed",
  "step_completed", "file_diff", "verification_receipt", "checkpoint", "run_terminated",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const isCount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isString = (value: unknown): value is string => typeof value === "string";
const optionalString = (value: unknown) => value === undefined || isString(value);

function validPayload(type: EventType, payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const step = () => isCount(payload.step) && payload.step > 0;
  switch (type) {
    case "run_started": {
      const limits = payload.limits;
      return isString(payload.taskId) && isString(payload.objective) && isString(payload.agentId)
        && isRecord(limits) && isCount(limits.maxSteps) && isCount(limits.maxTokens) && isCount(limits.timeoutMs);
    }
    case "step_started": return step();
    case "tokens_reserved": return step() && isCount(payload.tokens) && isCount(payload.total);
    case "tool_called": return step() && isString(payload.name) && Object.hasOwn(payload, "input");
    case "tool_succeeded": return step() && isString(payload.name) && Object.hasOwn(payload, "output");
    case "tool_failed": return step() && isString(payload.name) && isString(payload.error);
    case "step_completed": return step() && typeof payload.done === "boolean" && optionalString(payload.summary);
    case "file_diff": return isString(payload.path) && (payload.before === null || isString(payload.before)) && (payload.after === null || isString(payload.after));
    case "verification_receipt": return (payload.verdict === "APPROVED" || payload.verdict === "REJECTED") && Array.isArray(payload.checks) && payload.checks.every(isString);
    case "checkpoint": return isString(payload.label);
    case "run_terminated": {
      const budget = payload.budget;
      return isString(payload.reason) && ["completed", "max_steps", "max_tokens", "timeout", "cancelled", "agent_error"].includes(payload.reason)
        && isRecord(budget) && isCount(budget.steps) && isCount(budget.tokensReserved)
        && typeof budget.elapsedMs === "number" && Number.isFinite(budget.elapsedMs) && budget.elapsedMs >= 0
        && isCount(budget.stepsRemaining) && isCount(budget.tokensRemaining)
        && optionalString(payload.summary) && optionalString(payload.error);
    }
  }
}

function assertJson(value: unknown, stack = new Set<object>()): asserts value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || stack.has(value)) throw new TypeError("Ledger payload must be finite, acyclic JSON");
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("Ledger payload must contain plain objects");
  }
  stack.add(value);
  for (const child of Object.values(value)) assertJson(child, stack);
  stack.delete(value);
}

function immutable<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

export class LedgerCorruptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerCorruptionError";
  }
}

/** Local single-writer JSONL log. The lock coordinates cooperating writers; it is not an access boundary. */
export class EventLog {
  readonly filePath: string;
  readonly boxId: string;
  readonly runId: string;
  private readonly lockPath: string;
  private readonly fd: number;
  private readonly events: ExecutionEvent[];
  private closed = false;
  private poisoned = false;
  private readonly now: () => Date;

  constructor(options: { filePath: string; boxId: string; runId?: string; now?: () => Date }) {
    if (!isString(options.boxId) || !options.boxId || (options.runId !== undefined && (!isString(options.runId) || !options.runId))) {
      throw new TypeError("Box and run IDs must be non-empty strings");
    }
    this.filePath = resolve(options.filePath);
    this.boxId = options.boxId;
    this.runId = options.runId ?? randomUUID();
    this.now = options.now ?? (() => new Date());
    this.lockPath = `${this.filePath}.lock`;
    mkdirSync(dirname(this.filePath), { recursive: true });
    let lockFd: number;
    try {
      lockFd = openSync(this.lockPath, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(`Ledger already has a writer (or a stale lock): ${this.lockPath}`);
      }
      throw error;
    }
    closeSync(lockFd);
    let fd: number | undefined;
    try {
      fd = openSync(this.filePath, constants.O_CREAT | constants.O_RDWR | constants.O_APPEND | constants.O_NOFOLLOW, 0o600);
      if (!fstatSync(fd).isFile()) throw new Error("Ledger path must be a regular file");
      this.events = EventLog.decode(readFileSync(fd, "utf8"), this.boxId);
      this.fd = fd;
    } catch (error) {
      if (fd !== undefined) closeSync(fd);
      unlinkSync(this.lockPath);
      throw error;
    }
  }

  static read(filePath: string, boxId?: string): readonly ExecutionEvent[] {
    if (!existsSync(filePath)) return [];
    return EventLog.decode(readFileSync(filePath, "utf8"), boxId);
  }

  private static decode(content: string, boxId?: string): ExecutionEvent[] {
    if (!content) return [];
    if (!content.endsWith("\n")) throw new LedgerCorruptionError("Ledger ends with a partial record; repair it explicitly before continuing");
    return content.slice(0, -1).split("\n").map((line, index) => {
      let event: ExecutionEvent;
      try {
        event = JSON.parse(line) as ExecutionEvent;
        if (!event || typeof event !== "object" || event.sequence !== index + 1 || !eventTypes.has(event.type)
          || typeof event.id !== "string" || !event.id || typeof event.runId !== "string" || !event.runId
          || typeof event.boxId !== "string" || !event.boxId || typeof event.at !== "string"
          || !Number.isFinite(Date.parse(event.at)) || !event.payload || typeof event.payload !== "object"
          || Array.isArray(event.payload) || (boxId !== undefined && event.boxId !== boxId)) {
          throw new Error("Invalid record envelope");
        }
        assertJson(event.payload);
        if (!validPayload(event.type, event.payload)) throw new Error("Payload does not match event type");
      } catch (error) {
        throw new LedgerCorruptionError(`Invalid ledger record ${index + 1}: ${String(error)}`);
      }
      return immutable(event);
    });
  }

  append<K extends EventType>(type: K, payload: EventPayloads[K]): ExecutionEvent<K> {
    if (this.closed || this.poisoned) throw new Error("Ledger is closed or an earlier write failed");
    assertJson(payload);
    if (!eventTypes.has(type) || !validPayload(type, payload)) throw new TypeError("Payload does not match event type");
    const event = {
      sequence: this.events.length + 1,
      id: randomUUID(),
      boxId: this.boxId,
      runId: this.runId,
      at: this.now().toISOString(),
      type,
      payload: structuredClone(payload),
    } as ExecutionEvent<K>;
    const bytes = Buffer.from(`${JSON.stringify(event)}\n`, "utf8");
    try {
      // A short write is possible: finish the entire record before admitting the next event.
      let written = 0;
      while (written < bytes.length) {
        const count = writeSync(this.fd, bytes, written, bytes.length - written);
        if (count === 0) throw new Error("Ledger write made no progress");
        written += count;
      }
      fsyncSync(this.fd);
    } catch (error) {
      this.poisoned = true;
      throw error;
    }
    this.events.push(immutable(event));
    return event;
  }

  readAll(): readonly ExecutionEvent[] {
    return Object.freeze([...this.events]);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      closeSync(this.fd);
    } finally {
      unlinkSync(this.lockPath);
    }
  }
}
