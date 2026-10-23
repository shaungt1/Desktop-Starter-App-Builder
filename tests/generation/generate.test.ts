/**
 * Full generation test: creates real apps from the example plans, installs
 * their packages and runs each app's own quality gate. Slow (minutes; Tauri
 * compiles Rust), so it runs only through `bun run test:generate`, in CI and
 * in the Docker image.
 *
 * Environment variables:
 * - DSAB_PLANS: comma-separated example names (default: every example)
 * - DSAB_E2E=1: also run each app's end-to-end tests (needs a display or xvfb-run;
 *   Tauri additionally needs tauri-driver and WebKitWebDriver on Linux)
 * - DSAB_KEEP=1: keep the generated apps for inspection
 */
import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../../cli/commands/create.ts";
import { loadCatalog } from "../../cli/lib/catalog.ts";
import { BUILDER_ROOT } from "../../cli/lib/paths.ts";
import { readPlan } from "../../cli/lib/plan.ts";

const examplesDir = path.join(BUILDER_ROOT, "plans", "examples");
const selected = process.env.DSAB_PLANS?.split(",").map((name) => name.trim());
const examples = fs
  .readdirSync(examplesDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => path.basename(file, ".json"))
  .filter((name) => !selected || selected.includes(name));

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "dsab-generate-"));
afterAll(() => {
  if (process.env.DSAB_KEEP !== "1") {
    fs.rmSync(workspace, { recursive: true, force: true });
  } else {
    console.log(`Generated apps kept in ${workspace}`);
  }
});

async function runScript(cwd: string, script: string): Promise<number> {
  const child = Bun.spawn(["bun", "run", script], { cwd, stdout: "inherit", stderr: "inherit" });
  return child.exited;
}

describe("generated apps pass their own checks", () => {
  for (const name of examples) {
    test(name, async () => {
      const plan = readPlan(path.join(examplesDir, `${name}.json`), loadCatalog());
      const target = path.join(workspace, name);
      await createApp(target, plan, { install: true, verify: true });
      if (process.env.DSAB_E2E === "1") {
        expect(await runScript(target, "test:e2e")).toBe(0);
      }
    });
  }
});
