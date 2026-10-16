import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EventLog, LedgerCorruptionError } from "../src/ledger/event-log.js";
import type { JsonValue } from "../src/runtime/types.js";

function directory(t: import("node:test").TestContext): string {
  const path = mkdtempSync(join(tmpdir(), "agentbox-ledger-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

test("reopening appends a globally ordered sequence without changing prior bytes", (t) => {
  const path = join(directory(t), "events.jsonl");
  const first = new EventLog({ filePath: path, boxId: "box-test", runId: "one" });
  const input = { label: "before" };
  const event = first.append("checkpoint", input);
  input.label = "changed outside";
  assert.equal(event.payload.label, "before");
  assert.throws(() => { event.payload.label = "mutate"; }, TypeError);
  first.close();
  const prefix = readFileSync(path, "utf8");
  const second = new EventLog({ filePath: path, boxId: "box-test", runId: "two" });
  second.append("verification_receipt", { verdict: "APPROVED", checks: ["sample tests"] });
  second.close();
  assert.equal(readFileSync(path, "utf8").startsWith(prefix), true);
  assert.deepEqual(EventLog.read(path).map(({ sequence, runId }) => [sequence, runId]), [[1, "one"], [2, "two"]]);
});

test("a second cooperating writer is rejected until the first closes", (t) => {
  const path = join(directory(t), "events.jsonl");
  const first = new EventLog({ filePath: path, boxId: "box-test" });
  try {
    assert.throws(() => new EventLog({ filePath: path, boxId: "box-test" }), /already has a writer/);
  } finally { first.close(); }
  const next = new EventLog({ filePath: path, boxId: "box-test" });
  next.close();
});

test("partial records and sequence corruption fail closed", (t) => {
  const path = join(directory(t), "events.jsonl");
  writeFileSync(path, '{"partial":');
  assert.throws(() => new EventLog({ filePath: path, boxId: "box-test" }), LedgerCorruptionError);
  writeFileSync(path, "");
  const log = new EventLog({ filePath: path, boxId: "box-test" });
  log.append("checkpoint", { label: "first" });
  log.close();
  writeFileSync(path, readFileSync(path, "utf8").replace('"sequence":1', '"sequence":2'));
  assert.throws(() => EventLog.read(path), LedgerCorruptionError);
});

test("a Box cannot reopen another Box's log", (t) => {
  const path = join(directory(t), "events.jsonl");
  const log = new EventLog({ filePath: path, boxId: "box-one" });
  log.append("checkpoint", { label: "private" });
  log.close();
  assert.throws(() => new EventLog({ filePath: path, boxId: "box-two" }), LedgerCorruptionError);
});

test("persisted payloads are validated against their event type", (t) => {
  const path = join(directory(t), "events.jsonl");
  const log = new EventLog({ filePath: path, boxId: "box-test" });
  log.append("step_started", { step: 1 });
  log.close();
  writeFileSync(path, readFileSync(path, "utf8").replace('"step":1', '"step":"wrong"'));
  assert.throws(() => EventLog.read(path), LedgerCorruptionError);
});

test("symlink log destinations are rejected", (t) => {
  const root = directory(t);
  const target = join(root, "target");
  const link = join(root, "link");
  writeFileSync(target, "");
  symlinkSync(target, link);
  assert.throws(() => new EventLog({ filePath: link, boxId: "box-test" }));
  assert.equal(readFileSync(target, "utf8"), "");
});

test("non-JSON payloads are rejected before writing and the log remains usable", (t) => {
  const path = join(directory(t), "events.jsonl");
  const log = new EventLog({ filePath: path, boxId: "box-test" });
  try {
    assert.throws(() => log.append("tool_called", { step: 1, name: "bad", input: NaN }), TypeError);
    const circular: { child?: JsonValue } = {};
    circular.child = circular as JsonValue;
    assert.throws(() => log.append("tool_called", { step: 1, name: "bad", input: circular as JsonValue }), TypeError);
    assert.equal(log.append("checkpoint", { label: "still usable" }).sequence, 1);
  } finally { log.close(); }
});
