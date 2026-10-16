import { performance } from "node:perf_hooks";
import type { BudgetLimits, BudgetSnapshot, Clock, TerminationReason } from "./types.js";

export const systemClock: Clock = {
  now: () => performance.now(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class BudgetExceededError extends Error {
  constructor(public readonly reason: "max_steps" | "max_tokens" | "timeout") {
    super(`Execution budget exhausted: ${reason}`);
    this.name = "BudgetExceededError";
  }
}

export class ExecutionBudget {
  readonly limits: Readonly<BudgetLimits>;
  readonly startedAt: number;
  private steps = 0;
  private tokensReserved = 0;

  constructor(limits: BudgetLimits, private readonly clock: Clock = systemClock) {
    for (const key of ["maxSteps", "maxTokens", "timeoutMs"] as const) {
      const value = limits[key];
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${key} must be a non-negative safe integer`);
      }
    }
    // Node's native timer otherwise turns an overflowing delay into a 1 ms timeout.
    if (limits.timeoutMs > 2_147_483_647) throw new RangeError("timeoutMs exceeds the timer range");
    this.limits = Object.freeze({ ...limits });
    this.startedAt = clock.now();
  }

  get elapsedMs(): number {
    return Math.max(0, this.clock.now() - this.startedAt);
  }

  get tokensRemaining(): number {
    return this.limits.maxTokens - this.tokensReserved;
  }

  /** Deadline first, then steps, then tokens, when several bounds are reached together. */
  exhaustionReason(): Extract<TerminationReason, "max_steps" | "max_tokens" | "timeout"> | undefined {
    if (this.elapsedMs >= this.limits.timeoutMs) return "timeout";
    if (this.steps >= this.limits.maxSteps) return "max_steps";
    if (this.tokensReserved >= this.limits.maxTokens) return "max_tokens";
    return undefined;
  }

  startStep(): number {
    const reason = this.exhaustionReason();
    if (reason) throw new BudgetExceededError(reason);
    return ++this.steps;
  }

  reserveTokens(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError("Token reservation must be a non-negative safe integer");
    }
    if (this.elapsedMs >= this.limits.timeoutMs) throw new BudgetExceededError("timeout");
    if (count > this.tokensRemaining) throw new BudgetExceededError("max_tokens");
    this.tokensReserved += count;
  }

  snapshot(): BudgetSnapshot {
    return {
      steps: this.steps,
      tokensReserved: this.tokensReserved,
      elapsedMs: this.elapsedMs,
      stepsRemaining: this.limits.maxSteps - this.steps,
      tokensRemaining: this.tokensRemaining,
    };
  }
}
