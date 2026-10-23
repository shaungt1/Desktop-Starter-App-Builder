/**
 * `doctor [--base electron|tauri] [--mobile] [--e2e]` — read-only check of the host machine.
 *
 * The checks live in shared/app-scripts/doctor.mjs, a dependency-free script
 * that is also copied into every generated app as scripts/doctor.mjs, so the
 * builder and the apps report exactly the same thing. It never installs
 * anything; scripts/bootstrap.sh and scripts/bootstrap.ps1 do.
 */
import path from "node:path";
import { UserError } from "../lib/log.ts";
import { SHARED_DIR } from "../lib/paths.ts";

export async function doctorCommand(argv: string[]): Promise<void> {
  const script = path.join(SHARED_DIR, "app-scripts", "doctor.mjs");
  const child = Bun.spawn([process.execPath, script, ...argv], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0) {
    throw new UserError("Required tools are missing (see above).", code);
  }
}
