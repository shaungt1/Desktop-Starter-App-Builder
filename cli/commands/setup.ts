/**
 * `setup TARGET` — installs dependencies of a generated app with its package manager and
 * creates .env from .env.example without overwriting an existing .env.
 */
import fs from "node:fs";
import path from "node:path";
import { run } from "../lib/exec.ts";
import { heading, info, success, UserError } from "../lib/log.ts";

export function requireApp(targetArg: string | undefined): string {
  if (!targetArg) {
    throw new UserError("A target application folder is required.", 2);
  }
  const target = path.resolve(targetArg);
  if (!fs.existsSync(path.join(target, "package.json"))) {
    throw new UserError(`No package.json in ${target}. Is this a generated app?`);
  }
  return target;
}

/** The package manager a generated app was created for (project-plan.json), "bun" for older apps. */
export function appPackageManager(target: string): string {
  const planFile = path.join(target, "project-plan.json");
  if (!fs.existsSync(planFile)) {
    return "bun";
  }
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8")) as { packageManager?: string };
  return plan.packageManager ?? "bun";
}

/** Runs a package.json script with the app's own package manager. */
export async function runScript(target: string, script: string): Promise<void> {
  await run([appPackageManager(target), "run", script], { cwd: target });
}

export async function setupApp(target: string): Promise<void> {
  const packageManager = appPackageManager(target);
  heading(`Installing dependencies in ${target} (${packageManager})`);
  await run([packageManager, "install"], { cwd: target });

  const example = path.join(target, ".env.example");
  const env = path.join(target, ".env");
  if (fs.existsSync(example) && !fs.existsSync(env)) {
    fs.copyFileSync(example, env);
    info("created .env from .env.example — fill in the values before running modules that need them");
  }
  success("dependencies installed");
}

export async function setupCommand(argv: string[]): Promise<void> {
  await setupApp(requireApp(argv[0]));
}
