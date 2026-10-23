/**
 * `verify TARGET` — runs the generated app's own quality gate
 * (the `verify` script: type check, lint, unit tests and, for Tauri, Rust checks).
 * The gate lives in the app so it keeps working after the app leaves the builder.
 */
import { heading, success } from "../lib/log.ts";
import { requireApp, runScript } from "./setup.ts";

export async function verifyApp(target: string): Promise<void> {
  heading(`Verifying ${target}`);
  await runScript(target, "verify");
  success("verification passed");
}

export async function verifyCommand(argv: string[]): Promise<void> {
  await verifyApp(requireApp(argv[0]));
}
