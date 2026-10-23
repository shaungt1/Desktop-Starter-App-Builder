/**
 * `plan new --out FILE [field flags]` — writes a project plan, asking for any
 * missing value when run in an interactive terminal.
 * `plan check FILE` — validates a plan and prints the resolved result
 * (defaults filled in, required modules added).
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { loadCatalog } from "../lib/catalog.ts";
import { writeJson } from "../lib/files.ts";
import { heading, info, success, UserError } from "../lib/log.ts";
import { normalizePlan, readPlan } from "../lib/plan.ts";

const interactive = Boolean(process.stdin.isTTY);

function ask(question: string, fallback: string): string {
  if (!interactive) {
    return fallback;
  }
  const answer = prompt(`${question}${fallback ? ` [${fallback}]` : ""}:`);
  return answer?.trim() || fallback;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

/** Plan fields accepted as command-line flags by `plan new` and `new`. */
export const PLAN_FLAGS = {
  name: { type: "string" },
  slug: { type: "string" },
  "app-id": { type: "string" },
  base: { type: "string" },
  profile: { type: "string" },
  "remote-url": { type: "string" },
  frontend: { type: "string" },
  ui: { type: "string" },
  "ui-theme": { type: "string" },
  "package-manager": { type: "string" },
  targets: { type: "string" },
  modules: { type: "string" },
  repository: { type: "string" },
  author: { type: "string" },
  /** Module options as module.option=value, repeatable: --option auth-oidc.issuer=https://id.example.com */
  option: { type: "string", multiple: true },
} as const;

type PlanFlagValues = { [K in Exclude<keyof typeof PLAN_FLAGS, "option">]?: string } & { option?: string[] };

/** Parses repeated `module.option=value` flags into the plan's moduleOptions. */
function parseModuleOptions(entries: readonly string[]): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const entry of entries) {
    const match = entry.match(/^([a-z0-9-]+)\.([A-Za-z0-9_]+)=(.*)$/u);
    if (!match) {
      throw new UserError(`--option must look like module.option=value (got "${entry}").`, 2);
    }
    const [, module = "", option = "", value = ""] = match;
    result[module] = { ...result[module], [option]: value };
  }
  return result;
}

const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Builds a raw plan from flags, asking for anything missing in an interactive
 * terminal and using defaults otherwise. The result is validated.
 */
export function collectPlan(values: PlanFlagValues): Record<string, unknown> {
  const catalog = loadCatalog();
  const name = values.name ?? ask("Application name", "");
  if (!name) {
    throw new UserError("--name is required when not running interactively.", 2);
  }
  const slug = values.slug ?? ask("Slug (folder/package name)", slugify(name));
  const appId = values["app-id"] ?? ask("Application id (reverse DNS)", `com.example.${slug.replaceAll("-", "")}`);
  const base = values.base ?? ask("Base (electron or tauri)", "electron");
  const baseDefinition = catalog.bases[base as "electron" | "tauri"];
  if (!baseDefinition) {
    throw new UserError("base must be electron or tauri", 2);
  }
  const profile =
    values.profile ??
    ask(`Profile (${Object.keys(baseDefinition.profiles).join(", ")})`, baseDefinition.defaultProfile);
  const remoteUrl = profile === "remote" ? (values["remote-url"] ?? ask("Hosted app URL", "")) : undefined;
  const frontend =
    values.frontend ??
    (profile === "native" ? ask(`Frontend (${Object.keys(catalog.frontends).join(", ")})`, "vite") : "vite");
  const ui = values.ui ?? ask(`Interface kit (${Object.keys(catalog.uiKits).join(", ")})`, "shadcn");
  const themes = catalog.uiKits[ui]?.themes;
  const uiTheme = themes
    ? (values["ui-theme"] ?? ask(`Konsta look (${themes.join(", ")})`, themes[0] ?? ""))
    : undefined;
  const packageManager =
    values["package-manager"] ?? ask(`Package manager (${Object.keys(catalog.packageManagers).join(", ")})`, "bun");
  const targets = list(
    values.targets ??
      (baseDefinition.targets.length > 1
        ? ask(`Targets (${baseDefinition.targets.join(", ")})`, "desktop")
        : "desktop"),
  );
  const available = catalog.modules
    .filter((module) => module.implementations[base as "electron" | "tauri"])
    .map((module) => module.id);
  const modules = list(values.modules ?? ask(`Modules, comma separated (${available.join(", ")})`, ""));

  const raw = {
    name,
    slug,
    appId,
    base,
    profile,
    remoteUrl,
    frontend,
    ui,
    uiTheme,
    packageManager,
    targets,
    modules,
    moduleOptions: parseModuleOptions(values.option ?? []),
    repository: values.repository,
    author: values.author,
  };
  normalizePlan(raw, catalog);
  return raw;
}

async function newPlan(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: { ...PLAN_FLAGS, out: { type: "string" }, force: { type: "boolean", default: false } },
  });
  if (!values.out) {
    throw new UserError("Usage: plan new --out FILE [--name N --base electron|tauri --modules a,b ...]", 2);
  }
  const out = path.resolve(values.out);
  if (fs.existsSync(out) && !values.force) {
    throw new UserError(`${out} exists. Pass --force to replace it.`);
  }
  writeJson(out, collectPlan(values));
  success(`wrote ${out}`);
  info("Module options (sign-in issuer, update feed...) go under moduleOptions; see plans/examples/.");
}

function checkPlan(file: string | undefined): void {
  if (!file) {
    throw new UserError("Usage: plan check FILE", 2);
  }
  const plan = readPlan(path.resolve(file), loadCatalog());
  heading(`Plan is valid: ${plan.name}`);
  console.log(JSON.stringify(plan, null, 2));
}

export async function planCommand(argv: string[]): Promise<void> {
  const [subcommand, ...rest] = argv;
  if (subcommand === "new") {
    await newPlan(rest);
  } else if (subcommand === "check") {
    checkPlan(rest[0]);
  } else {
    throw new UserError("Usage: plan new|check", 2);
  }
}
