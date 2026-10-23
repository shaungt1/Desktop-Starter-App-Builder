/**
 * Process execution helpers.
 *
 * Commands are passed as argument arrays (never as a shell string) so paths
 * with spaces work on Windows, macOS and Linux and nothing is interpreted by
 * a shell.
 */
import { UserError } from "./log.ts";

export interface RunOptions {
  cwd: string;
  env?: Record<string, string | undefined>;
  /** When true, a non-zero exit returns the code instead of throwing. */
  allowFailure?: boolean;
}

/** Runs a command with inherited stdio and returns its exit code. */
export async function run(command: string[], options: RunOptions): Promise<number> {
  const executable = Bun.which(command[0] ?? "");
  if (!executable) {
    throw new UserError(`Required program not found on PATH: ${command[0]}`);
  }
  const child = Bun.spawn([executable, ...command.slice(1)], {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0 && !options.allowFailure) {
    throw new UserError(`Command failed (exit ${code}): ${command.join(" ")}`, code);
  }
  return code;
}

/** Runs a command and captures stdout. Returns undefined when the program is missing or fails. */
export async function capture(command: string[], cwd = process.cwd()): Promise<string | undefined> {
  const executable = Bun.which(command[0] ?? "");
  if (!executable) {
    return undefined;
  }
  try {
    const child = Bun.spawn([executable, ...command.slice(1)], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
    return code === 0 ? output.trim() : undefined;
  } catch {
    return undefined;
  }
}
