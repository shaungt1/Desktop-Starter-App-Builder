#!/usr/bin/env bun
/**
 * Desktop Starter App Builder command-line entry point.
 *
 * Run through `bash start.sh <command>`, `./start.ps1 <command>` or
 * `bun cli/main.ts <command>`. Every command is also usable by an AI agent;
 * see AGENT_START.md for the order an agent should run them in.
 */
import { createCommand, newCommand } from "./commands/create.ts";
import { doctorCommand } from "./commands/doctor.ts";
import { listCommand } from "./commands/list.ts";
import { moduleCommand } from "./commands/module.ts";
import { planCommand } from "./commands/plan.ts";
import { releaseCommand, runCommand } from "./commands/run.ts";
import { setupCommand } from "./commands/setup.ts";
import { upstreamCommand } from "./commands/upstream.ts";
import { verifyCommand } from "./commands/verify.ts";
import { printError, UserError } from "./lib/log.ts";

const USAGE = `Desktop Starter App Builder

Usage: bash start.sh COMMAND [arguments]      (Windows: run it in Git Bash; PowerShell also works: .\\start.ps1 COMMAND ...)

Discover
  bootstrap [--base B] [--mobile] [--e2e] [--dry-run] [--yes]
                                         Detect this machine and install missing tools after asking
                                         (Windows via Git Bash + winget, macOS, Linux); runs before Bun exists
  doctor [--base B] [--mobile] [--e2e]   Check this machine for the tools a base needs (read-only)
  list                                   Bases, renderer profiles and how to choose
  module list [--base B] | show ID       Optional modules and what each installs

Plan (plan flags: --name N --base electron|tauri --profile P --frontend vite|nextjs
       --ui shadcn|konsta --ui-theme ios|material --package-manager bun|npm
       --targets desktop,android,ios --modules a,b --app-id ID --remote-url URL
       --option module.option=value, repeatable, for module options such as auth-oidc.issuer)
  plan new --out FILE [plan flags]       Write a plan file (asks for missing values in a terminal)
  plan check FILE                        Validate a plan and print it with defaults resolved

Generate and work on an app (TARGET is a full or relative path outside this repository)
  new TARGET [plan flags] [--install] [--verify]
                                         Clean-slate mode in one step: plan + create, no plan file needed
  create TARGET --plan FILE [--install] [--verify]
                                         Fill a new or near-empty folder with the app
  setup TARGET                           Install packages (bun or npm) and create .env from .env.example
  verify TARGET                          Type check, lint, unit tests (+ Rust checks for Tauri)
  run TARGET [dev|test|e2e]              Start development mode or run tests
  module add ID TARGET [--option k=v]    Add one module to a generated app, then install and verify
  release TARGET [--publish] [--yes]     Verify, then build installers (publish needs approval)

Maintain the builder
  upstream check | fetch                 Compare or fetch the pinned upstream sources
  help
`;

async function main(argv: string[]): Promise<void> {
  const [command = "help", ...rest] = argv;
  switch (command) {
    case "doctor":
      return doctorCommand(rest);
    case "list":
      return listCommand();
    case "module":
      return moduleCommand(rest);
    case "plan":
      return planCommand(rest);
    case "create":
      return createCommand(rest);
    case "new":
      return newCommand(rest);
    case "setup":
      return setupCommand(rest);
    case "verify":
      return verifyCommand(rest);
    case "run":
      return runCommand(rest);
    case "release":
      return releaseCommand(rest);
    case "upstream":
      return upstreamCommand(rest);
    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      return;
    default:
      console.log(USAGE);
      throw new UserError(`Unknown command: ${command}`, 2);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.exit(printError(error));
});
