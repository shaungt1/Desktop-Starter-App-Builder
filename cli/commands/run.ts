/**
 * `run TARGET [dev|test|e2e]` — starts a generated app's development mode or tests.
 * `release TARGET [--publish] [--yes]` — builds installers; publishing needs explicit approval.
 */
import { parseArgs } from "node:util";
import { readProvenance } from "../lib/compose.ts";
import { heading, success, UserError } from "../lib/log.ts";
import { requireApp, runScript } from "./setup.ts";

const RUN_SCRIPTS: Record<string, string> = {
  dev: "dev",
  test: "test",
  e2e: "test:e2e",
};

export async function runCommand(argv: string[]): Promise<void> {
  const [targetArg, mode = "dev"] = argv;
  const target = requireApp(targetArg);
  const script = RUN_SCRIPTS[mode];
  if (!script) {
    throw new UserError(`Unknown run mode "${mode}". Use: ${Object.keys(RUN_SCRIPTS).join(", ")}`, 2);
  }
  heading(`${script} (${target})`);
  await runScript(target, script);
}

function confirm(question: string): boolean {
  if (!process.stdin.isTTY) {
    return false;
  }
  const answer = prompt(`${question} [y/N]`);
  return answer?.trim().toLowerCase() === "y";
}

export async function releaseCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      publish: { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
      "skip-verify": { type: "boolean", default: false },
    },
  });
  const target = requireApp(positionals[0]);
  const { base } = readProvenance(target);

  if (!values["skip-verify"]) {
    heading("Verification gate before release");
    await runScript(target, "verify");
  }

  if (values.publish && base === "tauri") {
    throw new UserError(
      "Tauri apps publish from CI with tauri-apps/tauri-action (see docs/RELEASE_AND_SIGNING.md). Run release without --publish to build installers locally.",
    );
  }
  if (values.publish) {
    const approved = values.yes || confirm("Publishing uploads installers and creates a public release. Continue?");
    if (!approved) {
      throw new UserError("Publishing needs approval: re-run interactively or pass --yes for this release.");
    }
  }

  const script = values.publish ? "publish" : base === "electron" ? "make" : "build:app";
  heading(script);
  await runScript(target, script);
  success(values.publish ? "published" : "installers built (see the app's README for the output folder)");
}
