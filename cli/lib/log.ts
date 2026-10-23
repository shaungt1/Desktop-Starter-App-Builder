/**
 * Console output helpers for the builder CLI.
 *
 * Every user-facing line goes through these functions so the output format
 * stays consistent and agents can parse it: headings start with "==>",
 * failures start with "error:", warnings with "warning:".
 */

const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;

function paint(code: number, text: string): string {
  return useColor ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export function heading(text: string): void {
  console.log(`\n${paint(36, "==>")} ${paint(1, text)}`);
}

export function info(text: string): void {
  console.log(`    ${text}`);
}

export function success(text: string): void {
  console.log(`    ${paint(32, "ok")} ${text}`);
}

export function warn(text: string): void {
  console.warn(`${paint(33, "warning:")} ${text}`);
}

/** A failure the user can act on. Thrown errors of this type print without a stack trace. */
export class UserError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "UserError";
    this.exitCode = exitCode;
  }
}

export function printError(error: unknown): number {
  if (error instanceof UserError) {
    console.error(`${paint(31, "error:")} ${error.message}`);
    return error.exitCode;
  }
  console.error(`${paint(31, "error:")} unexpected failure`);
  console.error(error);
  return 1;
}
