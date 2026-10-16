import {
  closeSync, constants, copyFileSync, existsSync, fstatSync, lstatSync, mkdirSync,
  openSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

export interface TreeEntry {
  path: string;
  type: "file" | "directory";
  bytes?: number;
}

export interface MountResult {
  destination: string;
  files: number;
  bytes: number;
  mode: "snapshot-copy";
}

export interface MountLimits {
  maxEntries: number;
  maxBytes: number;
}

export class WorkspaceBoundaryError extends Error {
  constructor(message: string) { super(message); this.name = "WorkspaceBoundaryError"; }
}

function within(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

/** Local path fencing and copy-in mounts. Use OS isolation before running untrusted code. */
export class BoxManager {
  readonly rootPath: string;

  constructor(rootPath: string) {
    mkdirSync(rootPath, { recursive: true });
    this.rootPath = realpathSync(rootPath);
  }

  private validateId(boxId: string): void {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(boxId)) {
      throw new WorkspaceBoundaryError("Box IDs must contain 1–63 lowercase letters, digits or hyphens, starting with a letter or digit");
    }
  }

  createBox(boxId: string): string {
    this.validateId(boxId);
    const path = join(this.rootPath, boxId);
    if (!existsSync(path)) mkdirSync(path);
    return this.boxPath(boxId);
  }

  boxPath(boxId: string): string {
    this.validateId(boxId);
    const candidate = join(this.rootPath, boxId);
    const stat = lstatSync(candidate);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new WorkspaceBoundaryError("Box root must be a real directory");
    const real = realpathSync(candidate);
    if (!within(this.rootPath, real)) throw new WorkspaceBoundaryError("Box root escaped the workspace root");
    return real;
  }

  /** Reject all symlink components, even links that currently point back inside the Box. */
  resolvePath(boxId: string, relativePath = "."): string {
    if (relativePath.includes("\0") || relativePath.includes("\\") || isAbsolute(relativePath)
      || /^[a-z]:/i.test(relativePath) || relativePath.split("/").includes("..")) {
      throw new WorkspaceBoundaryError("Only relative paths without parent traversal are allowed");
    }
    const root = this.boxPath(boxId);
    const candidate = resolve(root, relativePath);
    if (!within(root, candidate)) throw new WorkspaceBoundaryError("Path escaped the Box");
    let cursor = root;
    const parts = relative(root, candidate).split(sep).filter(Boolean);
    for (const [index, part] of parts.entries()) {
      cursor = join(cursor, part);
      let stat;
      try { stat = lstatSync(cursor); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
        throw error;
      }
      if (stat.isSymbolicLink()) throw new WorkspaceBoundaryError(`Symlinks are not allowed: ${part}`);
      if (index < parts.length - 1 && !stat.isDirectory()) throw new WorkspaceBoundaryError("An ancestor is not a directory");
      if (!within(root, realpathSync(cursor))) throw new WorkspaceBoundaryError("Resolved path escaped the Box");
    }
    return candidate;
  }

  readFile(boxId: string, path: string, maxBytes = 1_048_576): string {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError("maxBytes must be non-negative");
    const target = this.resolvePath(boxId, path);
    const fd = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile()) throw new WorkspaceBoundaryError("Only regular files can be read");
      if (stat.size > maxBytes) throw new RangeError(`File exceeds ${maxBytes} bytes`);
      const contents = readFileSync(fd);
      if (contents.byteLength > maxBytes) throw new RangeError(`File exceeds ${maxBytes} bytes`);
      return contents.toString("utf8");
    } finally { closeSync(fd); }
  }

  writeFile(boxId: string, path: string, contents: string): void {
    const target = this.resolvePath(boxId, path);
    if (target === this.boxPath(boxId)) throw new WorkspaceBoundaryError("Cannot replace a Box root");
    mkdirSync(dirname(target), { recursive: true });
    this.resolvePath(boxId, path);
    const temporary = join(dirname(target), `.agentbox-write-${randomUUID()}`);
    try {
      writeFileSync(temporary, contents, { flag: "wx", mode: 0o600 });
      renameSync(temporary, target);
    } finally { rmSync(temporary, { force: true }); }
  }

  listTree(boxId: string, path = ".", maxEntries = 1_000): TreeEntry[] {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 0) throw new RangeError("maxEntries must be non-negative");
    const root = this.boxPath(boxId);
    const start = this.resolvePath(boxId, path);
    if (!lstatSync(start).isDirectory()) throw new WorkspaceBoundaryError("Tree root must be a directory");
    const entries: TreeEntry[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (entries.length >= maxEntries) throw new RangeError(`Tree exceeds ${maxEntries} entries`);
        const entryPath = join(directory, entry.name);
        const local = relative(root, entryPath).split(sep).join("/");
        this.resolvePath(boxId, local);
        if (entry.isDirectory()) {
          entries.push({ path: local, type: "directory" });
          visit(entryPath);
        } else if (entry.isFile()) {
          entries.push({ path: local, type: "file", bytes: lstatSync(entryPath).size });
        } else throw new WorkspaceBoundaryError(`Only regular files and directories are supported: ${local}`);
      }
    };
    visit(start);
    return entries;
  }

  /** Copies a user-selected file/folder. It never creates a live bind mount or overwrites a destination. */
  mount(boxId: string, sourcePath: string, destination = basename(sourcePath), limits: MountLimits = { maxEntries: 10_000, maxBytes: 100_000_000 }): MountResult {
    for (const [key, value] of Object.entries(limits)) {
      if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${key} must be a non-negative safe integer`);
    }
    const box = this.boxPath(boxId);
    const target = this.resolvePath(boxId, destination);
    if (target === box) throw new WorkspaceBoundaryError("Mount destination must be a child of the Box");
    if (existsSync(target)) throw new WorkspaceBoundaryError("Mount destination already exists");
    const source = resolve(sourcePath);
    const sourceStat = lstatSync(source);
    if (sourceStat.isSymbolicLink()) throw new WorkspaceBoundaryError("Mount source must not be a symlink");
    const sourceReal = realpathSync(source);
    if (sourceStat.isDirectory() && within(sourceReal, box)) {
      throw new WorkspaceBoundaryError("Cannot mount a folder that contains the destination Box");
    }
    const files: { source: string; path: string; bytes: number }[] = [];
    const directories: string[] = [];
    let bytes = 0;
    const scan = (current: string, local: string) => {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) throw new WorkspaceBoundaryError(`Mount source contains a symlink: ${local}`);
      if (stat.isDirectory()) {
        directories.push(local);
        if (directories.length + files.length > limits.maxEntries) throw new RangeError("Mount exceeds the entry limit");
        for (const name of readdirSync(current).sort()) scan(join(current, name), local ? join(local, name) : name);
      } else if (stat.isFile()) {
        files.push({ source: current, path: local, bytes: stat.size });
        bytes += stat.size;
        if (directories.length + files.length > limits.maxEntries || bytes > limits.maxBytes) throw new RangeError("Mount exceeds entry or byte limits");
      } else throw new WorkspaceBoundaryError("Mount source contains an unsupported filesystem entry");
    };
    scan(sourceReal, "");
    mkdirSync(dirname(target), { recursive: true });
    this.resolvePath(boxId, destination);
    const temporary = join(dirname(target), `.agentbox-mount-${randomUUID()}`);
    try {
      if (sourceStat.isDirectory()) {
        mkdirSync(temporary);
        for (const directory of directories) if (directory) mkdirSync(join(temporary, directory), { recursive: true });
        for (const file of files) copyFileSync(file.source, join(temporary, file.path), constants.COPYFILE_EXCL);
      } else {
        copyFileSync(sourceReal, temporary, constants.COPYFILE_EXCL);
      }
      if (existsSync(target)) throw new WorkspaceBoundaryError("Mount destination appeared during the copy");
      this.resolvePath(boxId, destination);
      renameSync(temporary, target);
    } finally { rmSync(temporary, { recursive: true, force: true }); }
    return { destination: relative(box, target).split(sep).join("/"), files: files.length, bytes, mode: "snapshot-copy" };
  }
}
