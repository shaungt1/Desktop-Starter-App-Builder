/**
 * Writes docs/MODULES.md from config/catalog.json so the module reference can
 * never drift from what the generator actually installs.
 * Run with `bun run docs:modules`; `bun run verify` fails if the file is stale.
 */
import fs from "node:fs";
import path from "node:path";
import { BASE_IDS, loadCatalog } from "../cli/lib/catalog.ts";
import { BUILDER_ROOT } from "../cli/lib/paths.ts";

export const MODULES_DOC = path.join(BUILDER_ROOT, "docs", "MODULES.md");

export function renderModuleDocs(): string {
  const catalog = loadCatalog();
  const lines: string[] = [
    "# Modules",
    "",
    "<!-- Generated from config/catalog.json by `bun run docs:modules`. Do not edit by hand. -->",
    "",
    "A module is an optional capability added to a generated app: its code, its",
    "packages and, for Tauri, its Rust crates and permission grants. Modules are",
    "chosen in the project plan (`modules`) or added later with",
    "`bash start.sh module add <id> <app>`. A module that requires another one",
    "brings it in automatically. Modules marked *manual* are documented recipes",
    "rather than generated code, because the right choice differs per product.",
    "",
    "The table below summarizes availability; each module is then described in full. A Tauri entry of",
    '"yes, mobile" means the module also builds for the Android and iOS targets; plans with those targets',
    "accept only such modules.",
    "",
    `| Module | ${BASE_IDS.map((id) => catalog.bases[id].title).join(" | ")} | Requires |`,
    `| --- | ${BASE_IDS.map(() => "---").join(" | ")} | --- |`,
  ];
  for (const module of catalog.modules) {
    const cells = BASE_IDS.map((id) => {
      if (module.manualOnly) {
        return (module.appliesTo ?? BASE_IDS).includes(id) ? "manual" : "—";
      }
      if (!module.implementations[id]) {
        return "—";
      }
      return module.implementations[id]?.mobile ? "yes, mobile" : "yes";
    });
    lines.push(`| \`${module.id}\` | ${cells.join(" | ")} | ${(module.requires ?? []).join(", ") || "—"} |`);
  }
  lines.push(
    "",
    "Each section below lists what the module does, the packages it adds per base, its plan options and the steps a person must complete outside the code.",
    "",
  );

  for (const module of catalog.modules) {
    lines.push(`## ${module.title} (\`${module.id}\`)`, "", module.summary, "");
    if (module.requires?.length) {
      lines.push(`Requires: ${module.requires.map((id) => `\`${id}\``).join(", ")}.`, "");
    }
    for (const id of BASE_IDS) {
      const implementation = module.implementations[id];
      if (!implementation) {
        continue;
      }
      const npm = Object.keys({ ...implementation.dependencies, ...implementation.devDependencies });
      const crates = Object.keys(implementation.cargo ?? {});
      const parts = [
        npm.length ? `npm: ${npm.map((name) => `\`${name}\``).join(", ")}` : "no extra npm packages",
        crates.length ? `crates: ${crates.map((name) => `\`${name}\``).join(", ")}` : undefined,
        implementation.permissions?.length
          ? `browser permissions: ${implementation.permissions.map((name) => `\`${name}\``).join(", ")}`
          : undefined,
        implementation.commands?.length
          ? `commands: ${implementation.commands.map((name) => `\`${name}\``).join(", ")}`
          : undefined,
      ].filter(Boolean);
      lines.push(`- **${catalog.bases[id].title}** (\`${implementation.overlay}\`): ${parts.join("; ")}.`);
    }
    if (Object.keys(module.implementations).length > 0) {
      lines.push("");
    }
    const options = Object.entries(module.options ?? {});
    if (options.length > 0) {
      lines.push(`Plan options, under \`moduleOptions["${module.id}"]\`:`, "");
      for (const [name, spec] of options) {
        lines.push(`- \`${name}\`${spec.required ? " (required)" : ""}: ${spec.description}`);
      }
      lines.push("");
    }
    if (module.manualSteps?.length) {
      lines.push(module.manualOnly ? "Steps:" : "Steps outside the code:", "");
      module.manualSteps.forEach((step, index) => {
        lines.push(`${index + 1}. ${step}`);
      });
      lines.push("");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

if (import.meta.main) {
  fs.writeFileSync(MODULES_DOC, renderModuleDocs());
  console.log(`wrote ${path.relative(BUILDER_ROOT, MODULES_DOC)}`);
}
