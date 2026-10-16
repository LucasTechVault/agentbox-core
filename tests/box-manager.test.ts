import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BoxManager, WorkspaceBoundaryError } from "../src/workspace/box-manager.js";

function fixture(t: import("node:test").TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "agentbox-workspace-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const manager = new BoxManager(join(directory, "boxes"));
  manager.createBox("box-one");
  manager.createBox("box-two");
  return { directory, manager };
}

test("path traversal, absolute paths and ambiguous Windows paths are fenced", (t) => {
  const { directory, manager } = fixture(t);
  for (const path of ["../box-two/secret", "nested/../../escape", directory, "C:\\secret", "nested\\file", "bad\0name"]) {
    assert.throws(() => manager.resolvePath("box-one", path), WorkspaceBoundaryError);
  }
  assert.throws(() => manager.createBox("../invalid"), WorkspaceBoundaryError);
  assert.equal(existsSync(join(directory, "escape")), false);
});

test("symlink files, ancestor directories and Box roots cannot cross the boundary", (t) => {
  const { directory, manager } = fixture(t);
  const outside = join(directory, "outside");
  mkdirSync(outside);
  writeFileSync(join(outside, "secret"), "private");
  const box = manager.boxPath("box-one");
  symlinkSync(outside, join(box, "link"));
  symlinkSync(join(outside, "secret"), join(box, "secret"));
  symlinkSync(outside, join(manager.rootPath, "box-link"));
  assert.throws(() => manager.readFile("box-one", "link/secret"), WorkspaceBoundaryError);
  assert.throws(() => manager.writeFile("box-one", "secret", "overwrite"), WorkspaceBoundaryError);
  assert.throws(() => manager.listTree("box-one"), WorkspaceBoundaryError);
  assert.throws(() => manager.boxPath("box-link"), WorkspaceBoundaryError);
  assert.equal(readFileSync(join(outside, "secret"), "utf8"), "private");
});

test("writes stay local and reads and tree listings enforce bounds", (t) => {
  const { manager } = fixture(t);
  manager.writeFile("box-one", "nested/file.txt", "hello");
  assert.equal(manager.readFile("box-one", "nested/file.txt"), "hello");
  assert.throws(() => manager.readFile("box-one", "nested/file.txt", 4), RangeError);
  assert.deepEqual(manager.listTree("box-one").map(({ path }) => path), ["nested", "nested/file.txt"]);
  assert.throws(() => manager.listTree("box-one", ".", 1), RangeError);
  assert.deepEqual(manager.listTree("box-two"), []);
});

test("folder mounts make independent snapshots and never overwrite destinations", (t) => {
  const { directory, manager } = fixture(t);
  const source = join(directory, "source");
  mkdirSync(join(source, "nested"), { recursive: true });
  writeFileSync(join(source, "nested", "file.txt"), "original");
  const result = manager.mount("box-one", source, "project");
  assert.deepEqual(result, { destination: "project", files: 1, bytes: 8, mode: "snapshot-copy" });
  writeFileSync(join(source, "nested", "file.txt"), "source changed");
  assert.equal(manager.readFile("box-one", "project/nested/file.txt"), "original");
  manager.writeFile("box-one", "project/nested/file.txt", "box changed");
  assert.equal(readFileSync(join(source, "nested", "file.txt"), "utf8"), "source changed");
  assert.throws(() => manager.mount("box-one", source, "project"), /already exists/);
});

test("file mounts and preflight limits work without leaving partial copies", (t) => {
  const { directory, manager } = fixture(t);
  const file = join(directory, "document.txt");
  writeFileSync(file, "hello");
  assert.throws(() => manager.mount("box-one", file, "too-big.txt", { maxEntries: 10, maxBytes: 4 }), RangeError);
  assert.equal(existsSync(join(manager.boxPath("box-one"), "too-big.txt")), false);
  manager.mount("box-one", file);
  assert.equal(manager.readFile("box-one", "document.txt"), "hello");
});

test("mounts reject symlinks, parent paths and sources containing the destination Box", (t) => {
  const { directory, manager } = fixture(t);
  const source = join(directory, "source");
  mkdirSync(source);
  symlinkSync(directory, join(source, "link"));
  assert.throws(() => manager.mount("box-one", source), WorkspaceBoundaryError);
  assert.throws(() => manager.mount("box-one", source, "../box-two/injected"), WorkspaceBoundaryError);
  assert.throws(() => manager.mount("box-one", directory, "recursive"), WorkspaceBoundaryError);
});
