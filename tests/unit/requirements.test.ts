/**
 * Keeps docs/REQUIREMENTS.md, the bootstrap scripts and the doctor check in
 * agreement about minimum tool versions and supported bases, so the checklist
 * given to developers can never say something the scripts do not enforce.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { BASE_IDS } from "../../cli/lib/catalog.ts";
import { BUILDER_ROOT } from "../../cli/lib/paths.ts";

const read = (file: string) => fs.readFileSync(path.join(BUILDER_ROOT, file), "utf8");
const requirements = read("docs/REQUIREMENTS.md");
const bootstrapSh = read("scripts/bootstrap.sh");
const bootstrapPs1 = read("scripts/bootstrap.ps1");
const doctor = read("shared/app-scripts/doctor.mjs");

/** Pulls `MIN_X="1.2.3"` out of bootstrap.sh. */
function shellMinimum(name: string): string {
  const match = bootstrapSh.match(new RegExp(`^MIN_${name}="([0-9.]+)"`, "mu"));
  if (!match?.[1]) throw new Error(`MIN_${name} not found in scripts/bootstrap.sh`);
  return match[1];
}

describe("minimum versions", () => {
  for (const [tool, doctorName] of [
    ["BUN", "Bun"],
    ["NODE", "Node.js"],
    ["RUST", "Rust compiler (rustc)"],
  ] as const) {
    test(`${tool} is the same in the requirements page, bootstrap.sh and doctor.mjs`, () => {
      const minimum = shellMinimum(tool);
      expect(requirements).toContain(minimum);
      expect(doctor).toMatch(
        new RegExp(`name: "${doctorName.replace(/[()]/gu, "\\$&")}"[\\s\\S]*?minimum: "${minimum}"`, "u"),
      );
    });
  }

  test("bootstrap.ps1 uses the same minimums", () => {
    for (const [variable, tool] of [
      ["MinBun", "BUN"],
      ["MinNode", "NODE"],
      ["MinRust", "RUST"],
    ] as const) {
      expect(bootstrapPs1).toMatch(
        new RegExp(`\\$${variable}\\s*=\\s*\\[version\\]'${shellMinimum(tool).replaceAll(".", "\\.")}'`, "u"),
      );
    }
  });
});

describe("supported bases", () => {
  test("every base appears in the requirements page, doctor.mjs and both bootstrap scripts", () => {
    for (const id of BASE_IDS) {
      expect(requirements).toContain(`--base ${id}`);
      expect(doctor).toContain(`"${id}"`);
      expect(bootstrapSh).toContain(id);
      expect(bootstrapPs1).toContain(`'${id}'`);
    }
  });

  test("the requirements page names the prompt and scripts it relies on", () => {
    for (const file of [
      "prompts/setup-machine.md",
      "scripts/bootstrap.sh",
      "scripts/bootstrap.ps1",
      "docs/SETUP_RESOURCES.md",
    ]) {
      expect(fs.existsSync(path.join(BUILDER_ROOT, file))).toBe(true);
    }
    expect(requirements).toContain("prompts/setup-machine.md");
  });
});
