/**
 * The project plan: one JSON file that fully describes the application to
 * generate. A plan is the contract between the person (or agent) choosing
 * options and the generator applying them; it is copied into the generated
 * app so the result is reproducible.
 */
import fs from "node:fs";
import {
  BASE_IDS,
  type BaseId,
  type Catalog,
  defaultChoice,
  findModule,
  resolveModules,
  TARGET_IDS,
  type TargetId,
} from "./catalog.ts";
import { UserError } from "./log.ts";

export interface ThemePlan {
  /** CSS color values (any valid CSS color, e.g. "oklch(0.55 0.2 260)" or "#3b82f6"). */
  primary: string;
  primaryForeground: string;
  accent: string;
  radius: string;
}

export interface ProjectPlan {
  name: string;
  slug: string;
  appId: string;
  scheme: string;
  description: string;
  author: string;
  version: string;
  base: BaseId;
  profile: string;
  /** Remote profile only: the hosted web app the window loads. */
  remoteUrl?: string;
  /** Remote profile only: extra origins navigation may stay on (login pages, CDNs). */
  allowedOrigins: string[];
  /** Optional "owner/name" GitHub repository used by publishers and the GitHub updater. */
  repository?: string;
  /** How the interface is built: "vite" (React + Vite, default) or "nextjs" (Next.js static export). */
  frontend: string;
  /** Component kit for the app shell and screens: "shadcn" (default) or "konsta". */
  ui: string;
  /** Konsta UI only: "ios" or "material" look. */
  uiTheme?: string;
  /** Package manager the generated app's scripts and docs use: "bun" (default) or "npm". */
  packageManager: string;
  /** Platforms to build for. Always includes "desktop"; Tauri may add "android" and "ios". */
  targets: TargetId[];
  modules: string[];
  moduleOptions: Record<string, Record<string, unknown>>;
  theme: ThemePlan;
}

function choice(value: unknown, field: string, choices: Record<string, unknown>, fallback: string): string {
  const picked = value === undefined || value === null || value === "" ? fallback : String(value);
  if (!(picked in choices)) {
    throw new UserError(`${field} must be one of: ${Object.keys(choices).join(", ")} (got "${picked}").`);
  }
  return picked;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SCHEME = /^[a-z][a-z0-9+.-]*$/u;
const APP_ID = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*)+$/iu;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const UNSAFE_CSS = /[;{}<>]/u;

const DEFAULT_THEME: ThemePlan = {
  primary: "oklch(0.546 0.245 262.881)",
  primaryForeground: "oklch(0.985 0 0)",
  accent: "oklch(0.97 0.014 254.604)",
  radius: "0.625rem",
};

/** Characters that would break the JSON, TOML and source files the values are written into. */
const UNSAFE_TEXT = /["\\`\r\n$]/u;

function text(value: unknown, field: string, fallback?: string): string {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new UserError(`Plan field "${field}" is required.`);
  }
  if (typeof value !== "string") {
    throw new UserError(`Plan field "${field}" must be a string.`);
  }
  if (UNSAFE_TEXT.test(value)) {
    throw new UserError(`Plan field "${field}" must not contain quotes, backslashes, backticks, $ or line breaks.`);
  }
  return value.trim();
}

function validateUrl(value: string, field: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new UserError(`Plan field "${field}" must be an absolute URL.`);
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new UserError(`Plan field "${field}" must use https (http is allowed only for localhost).`);
  }
  return parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname);
}

/** Validates raw JSON and fills defaults. Throws UserError with the first problem found. */
export function normalizePlan(input: Record<string, unknown>, catalog: Catalog): ProjectPlan {
  const name = text(input.name, "name");
  const slug = text(input.slug, "slug").toLowerCase();
  if (!SLUG.test(slug)) {
    throw new UserError('slug must use lowercase letters, numbers and single hyphens, e.g. "acme-notes".');
  }
  const appId = text(input.appId, "appId");
  if (!APP_ID.test(appId)) {
    throw new UserError('appId must be reverse-DNS style, e.g. "com.acme.notes".');
  }
  const scheme = text(input.scheme, "scheme", slug.replaceAll("-", "")).toLowerCase();
  if (!SCHEME.test(scheme)) {
    throw new UserError(`scheme "${scheme}" is not a valid URL scheme.`);
  }
  const version = text(input.version, "version", "0.1.0");
  if (!SEMVER.test(version)) {
    throw new UserError(`version "${version}" must be semantic (MAJOR.MINOR.PATCH).`);
  }

  const base = text(input.base, "base", "electron") as BaseId;
  if (!BASE_IDS.includes(base)) {
    throw new UserError(`base must be one of: ${BASE_IDS.join(", ")}`);
  }
  const baseDefinition = catalog.bases[base];
  const profile = text(input.profile, "profile", baseDefinition.defaultProfile);
  if (!baseDefinition.profiles[profile]) {
    throw new UserError(
      `${base} has no profile "${profile}". Options: ${Object.keys(baseDefinition.profiles).join(", ")}`,
    );
  }

  const remoteUrl = input.remoteUrl ? validateUrl(text(input.remoteUrl, "remoteUrl"), "remoteUrl") : undefined;
  if (profile === "remote" && !remoteUrl) {
    throw new UserError('The remote profile requires "remoteUrl" (the hosted app the window loads).');
  }
  const allowedOrigins = Array.isArray(input.allowedOrigins)
    ? input.allowedOrigins.map(
        (origin, index) => new URL(validateUrl(String(origin), `allowedOrigins[${index}]`)).origin,
      )
    : [];

  const repository = input.repository ? text(input.repository, "repository") : undefined;
  if (repository && !REPOSITORY.test(repository)) {
    throw new UserError('repository must look like "owner/name".');
  }

  const frontend = choice(input.frontend, "frontend", catalog.frontends, defaultChoice(catalog.frontends));
  const frontendProfiles = catalog.frontends[frontend]?.profiles;
  if (frontendProfiles && !frontendProfiles.includes(profile)) {
    throw new UserError(
      `The ${frontend} frontend works with the ${frontendProfiles.join(", ")} profile only (the plan uses "${profile}").`,
    );
  }
  const ui = choice(input.ui, "ui", catalog.uiKits, defaultChoice(catalog.uiKits));
  const themes = catalog.uiKits[ui]?.themes;
  const uiTheme = themes
    ? choice(input.uiTheme, "uiTheme", Object.fromEntries(themes.map((t) => [t, t])), themes[0] ?? "")
    : undefined;
  const packageManager = choice(
    input.packageManager,
    "packageManager",
    catalog.packageManagers,
    defaultChoice(catalog.packageManagers),
  );

  const rawTargets = Array.isArray(input.targets)
    ? input.targets.map(String)
    : typeof input.targets === "string"
      ? input.targets.split(",").map((target) => target.trim())
      : ["desktop"];
  for (const target of rawTargets) {
    if (!TARGET_IDS.includes(target as TargetId) || !baseDefinition.targets.includes(target as TargetId)) {
      throw new UserError(`${base} cannot build for "${target}". Targets: ${baseDefinition.targets.join(", ")}`);
    }
  }
  const targets = [...new Set<TargetId>(["desktop", ...(rawTargets as TargetId[])])];
  const mobile = targets.some((target) => target !== "desktop");

  const rawModules = Array.isArray(input.modules)
    ? input.modules.map(String)
    : typeof input.modules === "string"
      ? input.modules
          .split(",")
          .map((module) => module.trim())
          .filter(Boolean)
      : [];
  const modules = resolveModules(catalog, base, rawModules);
  if (mobile) {
    const desktopOnly = modules.filter((id) => !findModule(catalog, id).implementations[base]?.mobile);
    if (desktopOnly.length > 0) {
      throw new UserError(
        `These modules are desktop-only and cannot be combined with Android/iOS targets: ${desktopOnly.join(", ")}. ` +
          "Remove them, or build mobile from a separate plan.",
      );
    }
    if (profile !== "native") {
      throw new UserError("Android and iOS targets need the native profile.");
    }
    // Android package names allow only letters, digits and underscores in each segment.
    if (targets.includes("android") && !/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u.test(appId)) {
      throw new UserError(
        `appId "${appId}" cannot be an Android package name: use lowercase letters, digits and underscores in each segment (no hyphens).`,
      );
    }
  }

  const moduleOptions = (input.moduleOptions ?? {}) as Record<string, Record<string, unknown>>;
  for (const id of modules) {
    const definition = findModule(catalog, id);
    for (const [option, spec] of Object.entries(definition.options ?? {})) {
      if (spec.required && (moduleOptions[id]?.[option] === undefined || moduleOptions[id]?.[option] === "")) {
        throw new UserError(`Module "${id}" requires moduleOptions.${id}.${option}: ${spec.description}`);
      }
    }
  }

  const rawTheme = (input.theme ?? {}) as Partial<ThemePlan>;
  const theme: ThemePlan = { ...DEFAULT_THEME, ...rawTheme };
  for (const [key, value] of Object.entries(theme)) {
    if (typeof value !== "string" || value.trim() === "" || UNSAFE_CSS.test(value)) {
      throw new UserError(`theme.${key} must be a single CSS value without ; { } < >.`);
    }
  }

  return {
    name,
    slug,
    appId,
    scheme,
    description: text(input.description, "description", `${name} desktop application.`),
    author: text(input.author, "author", "Your Name"),
    version,
    base,
    profile,
    remoteUrl,
    allowedOrigins,
    repository,
    frontend,
    ui,
    ...(uiTheme ? { uiTheme } : {}),
    packageManager,
    targets,
    modules,
    moduleOptions,
    theme,
  };
}

export function readPlan(file: string, catalog: Catalog): ProjectPlan {
  if (!fs.existsSync(file)) {
    throw new UserError(`Plan file not found: ${file}`);
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch (error) {
    throw new UserError(`Plan file is not valid JSON: ${file} (${(error as Error).message})`);
  }
  return normalizePlan(raw, catalog);
}
