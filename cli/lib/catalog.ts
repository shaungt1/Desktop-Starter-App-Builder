/**
 * Typed access to config/catalog.json — the single data source that
 * describes every base framework, renderer profile and optional module.
 *
 * The generator and the agent instructions both read this file, so a script
 * run and an agent run resolve the same choices.
 */
import fs from "node:fs";
import { UserError } from "./log.ts";
import { CATALOG_FILE } from "./paths.ts";

export type BaseId = "electron" | "tauri";
export const BASE_IDS: readonly BaseId[] = ["electron", "tauri"];

export interface ProfileDefinition {
  title: string;
  summary: string;
  /** Folder (relative to the builder root) copied over the template. Files here replace template files. */
  overlay?: string;
  /** Plan fields that must be present when this profile is chosen. */
  requiresPlanFields?: string[];
}

export interface BaseDefinition {
  title: string;
  summary: string;
  chooseWhen: string[];
  avoidWhen: string[];
  template: string;
  /** Where the shared React interface (shared/renderer) is copied inside a generated app. */
  rendererDir: string;
  defaultProfile: string;
  profiles: Record<string, ProfileDefinition>;
  /** Platforms this base can build for. Tauri adds "android" and "ios" to "desktop". */
  targets: TargetId[];
  /** Builder files and folders copied into every app of this base (docs, setup scripts), so the app is self-contained. */
  bundledFiles: Array<{ from: string; to: string }>;
}

export type TargetId = "desktop" | "android" | "ios";
export const TARGET_IDS: readonly TargetId[] = ["desktop", "android", "ios"];

/** A folder copied into the app: "root" is the app folder, "renderer" is the base's rendererDir. */
export interface OverlaySpec {
  from: string;
  into: "root" | "renderer";
}

/** Changes to package.json made by a frontend or interface kit. */
export interface PackagePatch {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  removeDependencies?: string[];
}

/** How a frontend or interface kit changes a generated app on one base. Applied after the template and profile. */
export interface VariantImplementation {
  /** Copied in order, replacing existing files. */
  overlays: OverlaySpec[];
  /** Template files deleted before the overlays are copied (paths relative to the app root). */
  remove?: string[];
  packageJson?: PackagePatch;
  /** File name (relative to the app root) -> object deep-merged into that JSON file. */
  jsonPatches?: Record<string, Record<string, unknown>>;
  /** Tauri: object deep-merged into src-tauri/tauri.conf.json. */
  tauriConf?: Record<string, unknown>;
  /** Lines appended to .gitignore when missing. */
  gitignore?: string[];
  /** Text inserted after an anchor line in a copied file (for example a CSS import). */
  textInserts?: TextInsert[];
}

export interface TextInsert {
  /** File path relative to `into`. */
  file: string;
  into: "root" | "renderer";
  /** Exact existing text after which `text` is inserted on a new line. */
  after: string;
  text: string;
}

export interface VariantDefinition {
  title: string;
  summary: string;
  /** True for the choice used when a plan leaves the field out. */
  default?: boolean;
  /** Profiles this variant works with; all profiles when absent. */
  profiles?: string[];
  /** Interface kits only: allowed values of the plan's uiTheme field, first is the default. */
  themes?: string[];
  /** Absent for the default choice, which is what the template already contains. */
  implementations?: Partial<Record<BaseId, VariantImplementation>>;
}

export interface CargoDependency {
  version: string;
  features?: string[];
  defaultFeatures?: boolean;
}

export interface ModuleImplementation {
  /** Folder (relative to the builder root) whose files are added to the generated app. Never overwrites. */
  overlay: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  /** Electron: the module folder exports `mainModule` from src/main/modules/<id>/index.ts. */
  mainModule?: boolean;
  /** Both bases: the module folder exports `feature` from src/renderer/features/<id>/index.tsx. */
  rendererFeature?: boolean;
  /** Tauri: Rust crates added to src-tauri/Cargo.toml. */
  cargo?: Record<string, CargoDependency>;
  /** Tauri: Rust module name in src-tauri/src/modules/<name>.rs exposing `register`. */
  rustModule?: string;
  /** Tauri: whether the Rust module exposes `setup(app)`. */
  rustSetup?: boolean;
  /** Tauri: object deep-merged into src-tauri/tauri.conf.json. */
  tauriConf?: Record<string, unknown>;
  /** Tauri: fully qualified command paths for `generate_handler!`, relative to crate::modules. */
  commands?: string[];
  /** Tauri: true when the module also builds and runs on Android and iOS. */
  mobile?: boolean;
}

export interface ModuleOption {
  description: string;
  required: boolean;
  example?: unknown;
}

export interface ModuleDefinition {
  id: string;
  title: string;
  summary: string;
  category: string;
  /** Packages and steps are documented but not generated; an agent or person completes them. */
  manualOnly?: boolean;
  /** Manual-only modules: the bases the recipe applies to. */
  appliesTo?: BaseId[];
  requires?: string[];
  conflicts?: string[];
  env?: string[];
  options?: Record<string, ModuleOption>;
  manualSteps?: string[];
  implementations: Partial<Record<BaseId, ModuleImplementation>>;
}

export interface Catalog {
  schemaVersion: number;
  bases: Record<BaseId, BaseDefinition>;
  /** How the interface is built: "vite" (default) or "nextjs". */
  frontends: Record<string, VariantDefinition>;
  /** Component kit for the app shell and screens: "shadcn" (default) or "konsta". */
  uiKits: Record<string, VariantDefinition>;
  /** Package managers a generated app can use. */
  packageManagers: Record<string, { title: string; default?: boolean }>;
  modules: ModuleDefinition[];
}

/** The id of the entry marked `default` in a record of choices. */
export function defaultChoice(choices: Record<string, { default?: boolean }>): string {
  const found = Object.entries(choices).find(([, choice]) => choice.default);
  if (!found) {
    throw new UserError("The catalog marks no default choice.");
  }
  return found[0];
}

let cached: Catalog | undefined;

export function loadCatalog(): Catalog {
  if (cached) {
    return cached;
  }
  const raw = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8")) as Catalog;
  if (raw.schemaVersion !== 1) {
    throw new UserError(`Unsupported catalog schemaVersion ${raw.schemaVersion} in ${CATALOG_FILE}`);
  }
  cached = raw;
  return raw;
}

export function findModule(catalog: Catalog, id: string): ModuleDefinition {
  const found = catalog.modules.find((candidate) => candidate.id === id);
  if (!found) {
    const known = catalog.modules.map((module) => module.id).join(", ");
    throw new UserError(`Unknown module "${id}". Known modules: ${known}`);
  }
  return found;
}

/**
 * Expands a module selection with everything it requires and checks
 * conflicts and base support. Returns ids in dependency order.
 */
export function resolveModules(catalog: Catalog, base: BaseId, selected: string[]): string[] {
  const ordered: string[] = [];
  const visiting = new Set<string>();

  const visit = (id: string, chain: string[]) => {
    if (ordered.includes(id)) {
      return;
    }
    if (visiting.has(id)) {
      throw new UserError(`Module dependency cycle: ${[...chain, id].join(" -> ")}`);
    }
    const module = findModule(catalog, id);
    if (module.manualOnly) {
      throw new UserError(`Module "${id}" is a documented recipe, not generated code: bash start.sh module show ${id}`);
    }
    if (!module.implementations[base]) {
      throw new UserError(`Module "${id}" has no ${base} implementation.`);
    }
    visiting.add(id);
    for (const required of module.requires ?? []) {
      visit(required, [...chain, id]);
    }
    visiting.delete(id);
    ordered.push(id);
  };

  for (const id of selected) {
    visit(id, []);
  }

  for (const id of ordered) {
    for (const conflict of findModule(catalog, id).conflicts ?? []) {
      if (ordered.includes(conflict)) {
        throw new UserError(`Modules "${id}" and "${conflict}" cannot be used together.`);
      }
    }
  }
  return ordered;
}
