/**
 * `upstream fetch` — clones each pinned upstream source listed in
 * config/sources.json into .cache/upstreams at its recorded commit.
 * `upstream check` — reports whether each upstream has moved past its pin.
 *
 * The owned templates under electron/ and tauri/ are the source of truth.
 * Upstreams are fetched only to review and adopt their fixes deliberately.
 */
import fs from "node:fs";
import path from "node:path";
import { capture, run } from "../lib/exec.ts";
import { readJson } from "../lib/files.ts";
import { heading, info, UserError, warn } from "../lib/log.ts";
import { CACHE_DIR, SOURCES_FILE } from "../lib/paths.ts";

interface Source {
  id: string;
  kind: "git" | "npm";
  url?: string;
  commit?: string;
  package?: string;
  version?: string;
  license: string;
  usedFor: string;
}

function loadSources(): Source[] {
  return readJson<{ sources: Source[] }>(SOURCES_FILE).sources;
}

async function fetchSources(): Promise<void> {
  const root = path.join(CACHE_DIR, "upstreams");
  fs.mkdirSync(root, { recursive: true });
  for (const source of loadSources().filter((entry) => entry.kind === "git")) {
    const dir = path.join(root, source.id);
    heading(`${source.id} @ ${source.commit}`);
    if (!fs.existsSync(dir)) {
      await run(["git", "clone", "--quiet", "--filter=blob:none", source.url ?? "", dir], { cwd: root });
    }
    await run(["git", "fetch", "--quiet", "origin"], { cwd: dir });
    await run(["git", "checkout", "--quiet", source.commit ?? "HEAD"], { cwd: dir });
    info(`checked out into ${dir}`);
  }
}

async function checkSources(): Promise<void> {
  for (const source of loadSources()) {
    if (source.kind === "git") {
      const head = (await capture(["git", "ls-remote", source.url ?? "", "HEAD"]))?.split(/\s+/u)[0];
      if (!head) {
        warn(`${source.id}: could not reach ${source.url}`);
      } else if (head === source.commit) {
        info(`${source.id}: up to date (${head.slice(0, 10)})`);
      } else {
        info(`${source.id}: upstream moved ${source.commit?.slice(0, 10)} -> ${head.slice(0, 10)}`);
      }
    } else {
      const latest = await capture(["npm", "view", source.package ?? "", "version"]);
      info(`${source.id}: pinned ${source.version}, latest ${latest ?? "unknown"}`);
    }
  }
}

export async function upstreamCommand(argv: string[]): Promise<void> {
  const [subcommand] = argv;
  if (subcommand === "fetch") {
    await fetchSources();
  } else if (subcommand === "check") {
    await checkSources();
  } else {
    throw new UserError("Usage: upstream fetch|check", 2);
  }
}
