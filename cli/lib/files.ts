/**
 * File-system helpers used by the generator: copying folders, replacing
 * template tokens and checking whether a target folder is safe to fill.
 */
import fs from "node:fs";
import path from "node:path";
import { UserError } from "./log.ts";

/** Folder and file names never copied out of the builder. */
const ALWAYS_SKIPPED = new Set(["node_modules", ".git", "target", "dist", "out", ".vite", ".cache", "gen"]);

/** Files that may already exist in a target (for example a fresh GitHub repository). */
export const NEAR_EMPTY_ALLOWLIST = new Set([
  ".git",
  "README.md",
  "LICENSE",
  "LICENSE.md",
  ".gitignore",
  ".gitattributes",
  ".DS_Store",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".html",
  ".css",
  ".rs",
  ".toml",
  ".yml",
  ".yaml",
  ".txt",
  ".sql",
  ".env",
  ".example",
  ".gitignore",
  ".editorconfig",
  ".svg",
  ".desktop",
  ".sh",
  ".lock",
]);

export type CopyMode = "fail-on-conflict" | "overwrite" | "skip-existing";

export interface CopyReport {
  written: string[];
  skipped: string[];
}

/** Lists files (relative paths, forward slashes) under a folder, skipping build output. */
export function listFiles(root: string): string[] {
  const result: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ALWAYS_SKIPPED.has(entry.name)) {
        continue;
      }
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        result.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  };
  walk(root);
  return result.sort();
}

/**
 * Copies every file under `source` into `target`.
 * - fail-on-conflict: throws before writing anything if any file already exists.
 * - overwrite: replaces existing files (used only for profile overlays on a fresh copy).
 * - skip-existing: leaves existing files untouched and reports them.
 */
export function copyTree(source: string, target: string, mode: CopyMode): CopyReport {
  if (!fs.existsSync(source)) {
    throw new UserError(`Builder folder missing: ${source}`);
  }
  const files = listFiles(source);
  if (mode === "fail-on-conflict") {
    const conflicts = files.filter((file) => fs.existsSync(path.join(target, file)));
    if (conflicts.length > 0) {
      throw new UserError(`Refusing to overwrite existing files in ${target}:\n  ${conflicts.join("\n  ")}`);
    }
  }
  const report: CopyReport = { written: [], skipped: [] };
  for (const file of files) {
    const destination = path.join(target, file);
    if (mode === "skip-existing" && fs.existsSync(destination)) {
      report.skipped.push(file);
      continue;
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(source, file), destination);
    report.written.push(file);
  }
  return report;
}

function isTextFile(file: string): boolean {
  const base = path.basename(file);
  return TEXT_EXTENSIONS.has(path.extname(file)) || base.startsWith(".") || base === "LICENSE";
}

/** Replaces `__TOKEN__` placeholders in the given files (relative to root). */
export function replaceTokens(root: string, files: string[], tokens: Record<string, string>): void {
  for (const file of files) {
    if (!isTextFile(file)) {
      continue;
    }
    const absolute = path.join(root, file);
    const original = fs.readFileSync(absolute, "utf8");
    let updated = original;
    for (const [token, value] of Object.entries(tokens)) {
      updated = updated.replaceAll(token, value);
    }
    if (updated !== original) {
      fs.writeFileSync(absolute, updated);
    }
  }
}

/** Returns the entries in `target` that are not on the near-empty allowlist. */
export function unexpectedEntries(target: string): string[] {
  if (!fs.existsSync(target)) {
    return [];
  }
  return fs.readdirSync(target).filter((entry) => !NEAR_EMPTY_ALLOWLIST.has(entry));
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/**
 * Formats JSON the way Biome does in generated apps (2-space indent, 120
 * columns): objects one key per line, arrays of plain values on one line when
 * they fit (package.json: always one item per line, as Biome prints it).
 * Generated JSON then passes the apps' format check unchanged.
 */
export function formatJson(value: unknown, indent = 0, column = indent, expand = false): string {
  const pad = " ".repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const primitive = value.every((item) => item === null || typeof item !== "object");
    const inline = `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    if (primitive && !expand && column + inline.length + 1 <= 120) {
      return inline;
    }
    return `[\n${value.map((item) => `${pad}${formatJson(item, indent + 2, indent + 2, expand)}`).join(",\n")}\n${" ".repeat(indent)}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined);
    if (entries.length === 0) {
      return "{}";
    }
    const lines = entries.map(([key, item]) => {
      const prefix = `${pad}${JSON.stringify(key)}: `;
      return `${prefix}${formatJson(item, indent + 2, prefix.length, expand)}`;
    });
    return `{\n${lines.join(",\n")}\n${" ".repeat(indent)}}`;
  }
  return JSON.stringify(value);
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${formatJson(value, 0, 0, path.basename(file) === "package.json")}\n`);
}

/** Writes a file only if its content changed; returns whether it wrote. */
export function writeText(file: string, content: string): boolean {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) {
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}
