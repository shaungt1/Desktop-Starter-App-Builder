/**
 * `module list [--base B]`, `module show ID`, `module add ID TARGET [--option k=v]...`
 *
 * Modules are optional capabilities (database, secure storage, sign-in,
 * updates...). `add` installs one module into an app this builder generated,
 * using the provenance file to know what is already there.
 */
import path from "node:path";
import { parseArgs } from "node:util";
import { type BaseId, findModule, loadCatalog, resolveModules } from "../lib/catalog.ts";
import {
  applyPackageManager,
  copyModuleFiles,
  mergePackageManifest,
  readProvenance,
  writeAppConfig,
  writeElectronRegistries,
  writeExtensionRegistries,
  writeProvenance,
  writeTauriRegistries,
} from "../lib/compose.ts";
import { listFiles, replaceTokens, writeJson } from "../lib/files.ts";
import { heading, info, success, UserError } from "../lib/log.ts";
import { BUILDER_ROOT } from "../lib/paths.ts";
import { normalizePlan } from "../lib/plan.ts";
import { templateTokens } from "./create.ts";
import { requireApp, setupApp } from "./setup.ts";
import { verifyApp } from "./verify.ts";

function listModules(base?: string): void {
  const catalog = loadCatalog();
  heading(base ? `Modules available for ${base}` : "Modules");
  for (const module of catalog.modules) {
    const bases = Object.keys(module.implementations).join(", ") || "documentation only";
    if (base && !module.implementations[base as BaseId] && !module.manualOnly) {
      continue;
    }
    const flag = module.manualOnly ? " [manual]" : "";
    info(`${module.id.padEnd(18)} ${module.title}${flag}  (${bases})`);
  }
  info("");
  info("Details: bash start.sh module show <id>");
}

function showModule(id: string | undefined): void {
  if (!id) {
    throw new UserError("Usage: module show ID", 2);
  }
  const module = findModule(loadCatalog(), id);
  heading(`${module.title} (${module.id})`);
  info(module.summary);
  if (module.requires?.length) {
    info(`requires: ${module.requires.join(", ")}`);
  }
  if (module.conflicts?.length) {
    info(`conflicts with: ${module.conflicts.join(", ")}`);
  }
  for (const [base, implementation] of Object.entries(module.implementations)) {
    const packages = Object.keys(implementation?.dependencies ?? {});
    const crates = Object.keys(implementation?.cargo ?? {});
    info(`${base}: npm [${packages.join(", ") || "none"}]${crates.length ? ` cargo [${crates.join(", ")}]` : ""}`);
  }
  for (const [option, spec] of Object.entries(module.options ?? {})) {
    info(`option ${option}${spec.required ? " (required)" : ""}: ${spec.description}`);
  }
  for (const variable of module.env ?? []) {
    info(`environment: ${variable}`);
  }
  for (const step of module.manualSteps ?? []) {
    info(`manual step: ${step}`);
  }
}

function parseOptions(pairs: string[]): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index <= 0) {
      throw new UserError(`--option must look like key=value, got "${pair}"`, 2);
    }
    const key = pair.slice(0, index);
    const raw = pair.slice(index + 1);
    options[key] = raw.includes(",") ? raw.split(",").map((part) => part.trim()) : raw;
  }
  return options;
}

async function addModule(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      option: { type: "string", multiple: true, default: [] },
      "no-install": { type: "boolean", default: false },
      "no-verify": { type: "boolean", default: false },
    },
  });
  const [id, targetArg] = positionals;
  if (!id) {
    throw new UserError("Usage: module add ID TARGET [--option key=value]...", 2);
  }
  const target = requireApp(targetArg);
  const catalog = loadCatalog();
  const provenance = readProvenance(target);
  const base = provenance.base;
  const definition = findModule(catalog, id);
  if (definition.manualOnly) {
    throw new UserError(`"${id}" is documented only; follow: bash start.sh module show ${id}`);
  }

  const before = new Set(provenance.modules);
  const moduleOptions = { ...provenance.plan.moduleOptions };
  moduleOptions[id] = { ...moduleOptions[id], ...parseOptions(values.option as string[]) };
  const plan = normalizePlan(
    { ...provenance.plan, modules: [...provenance.modules, id], moduleOptions } as unknown as Record<string, unknown>,
    catalog,
  );
  const added = resolveModules(catalog, base, plan.modules).filter((module) => !before.has(module));
  if (added.length === 0) {
    info(`${id} is already installed`);
    return;
  }

  heading(`Adding ${added.join(", ")} to ${target}`);
  const filesBefore = new Set(listFiles(target));
  for (const module of added) {
    copyModuleFiles(catalog, base, module, target);
  }
  mergePackageManifest(catalog, base, plan.modules, target);
  if (base === "electron") {
    writeElectronRegistries(catalog, plan.modules, target);
  } else if (base === "extension") {
    writeExtensionRegistries(catalog, plan.modules, target);
  } else {
    writeTauriRegistries(catalog, plan.modules, target);
  }
  const newFiles = listFiles(target).filter((file) => !filesBefore.has(file));
  replaceTokens(target, newFiles, templateTokens(plan));
  applyPackageManager(plan.packageManager, target, newFiles);
  writeAppConfig(plan, target);
  writeJson(path.join(target, "project-plan.json"), plan);
  writeProvenance(target, { ...provenance, modules: plan.modules, plan, updatedAt: new Date().toISOString() });
  success(`added ${added.join(", ")}`);

  for (const module of added) {
    for (const step of findModule(catalog, module).manualSteps ?? []) {
      info(`manual step (${module}): ${step}`);
    }
  }
  if (!values["no-install"]) {
    await setupApp(target);
    if (!values["no-verify"]) {
      await verifyApp(target);
    }
  }
}

export async function moduleCommand(argv: string[]): Promise<void> {
  const [subcommand, ...rest] = argv;
  switch (subcommand) {
    case "list": {
      const { values } = parseArgs({ args: rest, options: { base: { type: "string" } } });
      listModules(values.base);
      return;
    }
    case "show":
      showModule(rest[0]);
      return;
    case "add":
      await addModule(rest);
      return;
    default:
      throw new UserError(`Usage: module list|show|add (builder root: ${BUILDER_ROOT})`, 2);
  }
}
