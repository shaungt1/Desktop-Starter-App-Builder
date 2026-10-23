/**
 * `create TARGET --plan PLAN.json [--install] [--verify]`
 *
 * Fills a new or near-empty folder with an application assembled from the
 * chosen base template, renderer profile and modules. The builder repository
 * itself is never copied, so it stays reusable.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { builderIdentity } from "../lib/builder-info.ts";
import { loadCatalog } from "../lib/catalog.ts";
import {
  applyPackageManager,
  applyTargets,
  applyVariant,
  copyBundledFiles,
  copyModuleFiles,
  mergePackageManifest,
  writeAppConfig,
  writeDocsIndex,
  writeElectronRegistries,
  writeExtensionRegistries,
  writeProvenance,
  writeTauriRegistries,
} from "../lib/compose.ts";
import { run } from "../lib/exec.ts";
import { copyTree, listFiles, replaceTokens, unexpectedEntries, writeJson } from "../lib/files.ts";
import { heading, info, success, UserError } from "../lib/log.ts";
import { BUILDER_ROOT, SHARED_DIR } from "../lib/paths.ts";
import { normalizePlan, type ProjectPlan, readPlan } from "../lib/plan.ts";
import { collectPlan, PLAN_FLAGS } from "./plan.ts";
import { setupApp } from "./setup.ts";
import { verifyApp } from "./verify.ts";

export function templateTokens(plan: ProjectPlan): Record<string, string> {
  const [owner = "your-github-user", repo = plan.slug] = plan.repository?.split("/") ?? [];
  return {
    __APP_NAME__: plan.name,
    __APP_SLUG__: plan.slug,
    __APP_CRATE__: plan.slug.replaceAll("-", "_"),
    __APP_ID__: plan.appId,
    __APP_SCHEME__: plan.scheme,
    __APP_DESCRIPTION__: plan.description,
    __APP_AUTHOR__: plan.author,
    __APP_VERSION__: plan.version,
    __REMOTE_URL__: plan.remoteUrl ?? "",
    __REPO_OWNER__: owner,
    __REPO_NAME__: repo,
    __THEME_PRIMARY_FOREGROUND__: plan.theme.primaryForeground,
    __THEME_PRIMARY__: plan.theme.primary,
    __THEME_ACCENT__: plan.theme.accent,
    __THEME_RADIUS__: plan.theme.radius,
    __UI_THEME__: plan.uiTheme ?? "",
    __FRONTEND__: plan.frontend === "nextjs" ? "Next.js (static export)" : "React + Vite",
    __UI_KIT__: plan.ui === "konsta" ? `Konsta UI (${plan.uiTheme ?? "ios"} look)` : "shadcn/ui",
    __PACKAGE_MANAGER__: plan.packageManager,
    __TARGETS__: plan.targets.join(", "),
  };
}

export async function createApp(targetArg: string, plan: ProjectPlan, options: { install: boolean; verify: boolean }) {
  const catalog = loadCatalog();
  const base = catalog.bases[plan.base];
  const target = path.resolve(targetArg);

  if (target === BUILDER_ROOT || target.startsWith(`${BUILDER_ROOT}${path.sep}`)) {
    throw new UserError("The target must be outside the builder repository so the builder stays reusable.");
  }
  const unexpected = unexpectedEntries(target);
  if (unexpected.length > 0) {
    throw new UserError(
      `Target is not empty: ${target}\nUnexpected entries: ${unexpected.join(", ")}\n` +
        "Only .git, README.md, LICENSE, .gitignore and .gitattributes may already exist. " +
        "For an existing app, use `module add` instead.",
    );
  }
  const hadGit = fs.existsSync(path.join(target, ".git"));

  heading(`Creating ${plan.name} (${plan.base}, ${plan.profile} profile)`);
  fs.mkdirSync(target, { recursive: true });

  const templateReport = copyTree(path.join(BUILDER_ROOT, base.template), target, "skip-existing");
  info(`template: ${templateReport.written.length} files`);
  if (templateReport.skipped.length > 0) {
    info(`kept your existing: ${templateReport.skipped.join(", ")}`);
  }
  const rendererDir = base.rendererDir ?? "";
  if (base.rendererDir) {
    copyTree(path.join(SHARED_DIR, "renderer"), path.join(target, base.rendererDir), "skip-existing");
    info(`shared interface -> ${base.rendererDir}`);
  }

  const profile = base.profiles[plan.profile];
  if (profile?.overlay) {
    copyTree(path.join(BUILDER_ROOT, profile.overlay), target, "overwrite");
    info(`profile overlay: ${plan.profile}`);
  }

  const frontend = catalog.frontends[plan.frontend]?.implementations?.[plan.base];
  if (frontend) {
    applyVariant(frontend, target, rendererDir);
    info(`frontend: ${plan.frontend}`);
  }
  const uiKit = catalog.uiKits[plan.ui]?.implementations?.[plan.base];
  if (uiKit) {
    applyVariant(uiKit, target, rendererDir);
    info(`interface kit: ${plan.ui}${plan.uiTheme ? ` (${plan.uiTheme})` : ""}`);
  }

  applyTargets(plan.targets, target);
  if (plan.targets.length > 1) {
    info(
      `targets: ${plan.targets.join(", ")} (run the android:init / ios:init scripts once the mobile SDKs are installed)`,
    );
  }

  for (const id of plan.modules) {
    copyModuleFiles(catalog, plan.base, id, target);
  }
  mergePackageManifest(catalog, plan.base, plan.modules, target);
  if (plan.base === "electron") {
    writeElectronRegistries(catalog, plan.modules, target);
  } else if (plan.base === "extension") {
    writeExtensionRegistries(catalog, plan.modules, target);
  } else {
    writeTauriRegistries(catalog, plan.modules, target);
  }
  info(`modules: ${plan.modules.length > 0 ? plan.modules.join(", ") : "(none — core only)"}`);

  writeAppConfig(plan, target);
  const userFiles = new Set(templateReport.skipped);
  replaceTokens(
    target,
    listFiles(target).filter((file) => !userFiles.has(file)),
    templateTokens(plan),
  );
  applyPackageManager(
    plan.packageManager,
    target,
    listFiles(target).filter((file) => !userFiles.has(file)),
  );
  writeJson(path.join(target, "project-plan.json"), plan);
  const bundled = copyBundledFiles(base.bundledFiles, target);
  writeDocsIndex(plan, target);
  info(`reference docs and setup scripts: ${bundled.length} files (docs/, scripts/)`);

  const now = new Date().toISOString();
  writeProvenance(target, {
    builder: await builderIdentity(),
    createdAt: now,
    updatedAt: now,
    base: plan.base,
    profile: plan.profile,
    modules: plan.modules,
    plan,
  });

  if (!hadGit) {
    await run(["git", "init", "-b", "main", "--quiet"], { cwd: target });
    info("initialized a new Git repository on branch main (no remote, no commit)");
  } else {
    info("kept your existing Git repository and remote");
  }
  success(`created ${target}`);

  if (options.install || options.verify) {
    await setupApp(target);
  }
  if (options.verify) {
    await verifyApp(target);
  }
  if (!options.install && !options.verify) {
    info(`Next: bash start.sh setup "${target}" && bash start.sh verify "${target}"`);
  }
}

export async function createCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      plan: { type: "string" },
      install: { type: "boolean", default: false },
      verify: { type: "boolean", default: false },
    },
  });
  const target = positionals[0];
  if (!target || !values.plan) {
    throw new UserError("Usage: create TARGET --plan PLAN.json [--install] [--verify]", 2);
  }
  const plan = readPlan(path.resolve(values.plan), loadCatalog());
  await createApp(target, plan, { install: Boolean(values.install), verify: Boolean(values.verify) });
}

/**
 * `new TARGET [plan flags] [--install] [--verify]` — clean-slate mode in one
 * step: builds the plan from flags (asking for missing values in a terminal),
 * then creates the app in TARGET, a full or relative path outside the builder.
 * The plan is saved in the app as project-plan.json.
 */
export async function newCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ...PLAN_FLAGS,
      install: { type: "boolean", default: false },
      verify: { type: "boolean", default: false },
    },
  });
  const target = positionals[0];
  if (!target) {
    throw new UserError(
      "Usage: new TARGET --name N --base electron|tauri|extension [--frontend vite|nextjs] [...] [--install] [--verify]",
      2,
    );
  }
  const plan = normalizePlan(collectPlan(values), loadCatalog());
  await createApp(target, plan, { install: Boolean(values.install), verify: Boolean(values.verify) });
}
