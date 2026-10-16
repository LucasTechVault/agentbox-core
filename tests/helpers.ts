import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { EventLog } from "../src/ledger/event-log.js";
import type { Clock } from "../src/runtime/types.js";

export function fixture(t: TestContext): { directory: string; ledger: EventLog } {
  const directory = mkdtempSync(join(tmpdir(), "agentbox-test-"));
  const ledger = new EventLog({ filePath: join(directory, "events.jsonl"), boxId: "box-test", runId: "run-test" });
  t.after(() => { ledger.close(); rmSync(directory, { recursive: true, force: true }); });
  return { directory, ledger };
}

export class FakeClock implements Clock {
  private time = 0;
  private sequence = 0;
  private timers = new Map<number, { at: number; callback: () => void }>();
  now(): number { return this.time; }
  setTimeout(callback: () => void, delayMs: number): number {
    const id = ++this.sequence;
    this.timers.set(id, { at: this.time + delayMs, callback });
    return id;
  }
  clearTimeout(handle: unknown): void { this.timers.delete(handle as number); }
  get pendingTimers(): number { return this.timers.size; }
  advance(ms: number): void {
    const target = this.time + ms;
    while (true) {
      const next = [...this.timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      this.time = next[1].at;
      this.timers.delete(next[0]);
      next[1].callback();
    }
    this.time = target;
  }
}
