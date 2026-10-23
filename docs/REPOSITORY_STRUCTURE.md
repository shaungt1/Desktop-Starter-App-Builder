# Repository structure

This document describes every folder and notable file in Desktop Starter App
Builder, what it is for, and when you would change it. It is written for a
reader who has never seen the repository. A short version of the same map is
in the main [`README.md`](../README.md).

## How the pieces fit together

The builder is a command-line program (`cli/`) that reads a **catalog** of
choices (`config/catalog.json`) and a **project plan** (a JSON file describing
one app). It then assembles the app in layers, each layer being a folder of
ordinary files copied into the destination:

1. the **base template** (`electron/template`, `tauri/template` or `extension/template`): a complete, working project;
2. the **shared interface** (`shared/renderer`): screens, layout and components both desktop bases use (browser extensions have their own);
3. a **profile overlay** (`electron/profiles/*`, `tauri/profiles/*`) when the window shows hosted or exported content;
4. a **frontend overlay** (`frontends/nextjs`) when the plan asks for Next.js;
5. an **interface-kit overlay** (`ui/konsta`) when the plan asks for Konsta UI;
6. one **module overlay** per enabled module (`electron/modules/*`, `tauri/modules/*`, `extension/modules/*`);
7. the **bundled support files**: reference docs and setup scripts copied into the app's `docs/` and `scripts/`.

After copying, the builder writes small generated "registry" files that import
the enabled modules, replaces `__PLACEHOLDER__` tokens with values from the
plan, rewrites commands for the chosen package manager, and starts a fresh Git
repository in the destination. The tables below follow the same order as the
folders appear on disk.

## Root files

The files at the top level are entry points and configuration for the builder
itself; none of them is copied into generated apps.

| File | Purpose |
| --- | --- |
| `start.sh`, `start.ps1` | Entry points for Bash (macOS, Linux, Git Bash on Windows) and PowerShell. They find Bun and run `cli/main.ts`. |
| `AGENT_START.md` | The single source of truth for AI agents: modes of work, decisions to collect, the gated sequence, rules. |
| `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` | Short pointers that send each agent tool to `AGENT_START.md`. |
| `README.md`, `QUICKSTART.md` | Overview and a step-by-step first run. |
| `CONTRIBUTING.md` | How to change the builder (contributing mode): adding modules, profiles, frontends and interface kits. |
| `CHANGELOG.md`, `LICENSE` | Release notes and the MIT license. |
| `package.json`, `bun.lock`, `tsconfig.json`, `biome.json` | The builder's own dependencies, TypeScript settings and lint/format rules. |
| `compose.yaml`, `.dockerignore` | The optional Docker setup (see `docker/`). |
| `.editorconfig`, `.gitattributes`, `.gitignore` | Editor and Git settings; `generated/` is ignored for local test output. |

## `cli/` — the builder program

The program is TypeScript run directly by Bun. Commands live in
`cli/commands/`, shared logic in `cli/lib/`.

| File | Purpose |
| --- | --- |
| `main.ts` | Parses the command name and prints usage. |
| `commands/doctor.ts` | Runs `shared/app-scripts/doctor.mjs` (the machine check) with the given options. |
| `commands/list.ts` | Prints bases, profiles and the decision rule. |
| `commands/plan.ts` | `plan new` (write a plan from flags or questions) and `plan check` (validate and print it). |
| `commands/create.ts` | `create` (generate from a plan file) and `new` (plan from flags plus create, in one step). |
| `commands/setup.ts`, `verify.ts`, `run.ts` | Install packages, run the app's quality gate, start dev mode or tests, build or publish installers. They use the app's own package manager. |
| `commands/module.ts` | `module list`, `module show`, `module add`. |
| `commands/upstream.ts` | Compares the templates with the pinned upstream projects in `config/sources.json`. |
| `lib/catalog.ts` | Types and loading for `config/catalog.json`; resolves module dependencies. |
| `lib/plan.ts` | Validates a plan and fills defaults (frontend, interface kit, package manager, targets). |
| `lib/compose.ts` | The assembly steps: module files, registries, Cargo and `tauri.conf.json` merging, frontend and kit overlays, package-manager rewriting, mobile scripts, bundled docs. |
| `lib/files.ts` | Copying folders, replacing tokens, writing JSON in the apps' format. |
| `lib/exec.ts`, `lib/log.ts`, `lib/paths.ts`, `lib/builder-info.ts` | Running programs, output formatting, well-known paths, builder version for provenance. |

## `config/` — choices as data

| File | Purpose |
| --- | --- |
| `catalog.json` | Every base (template, profiles, targets, bundled files), frontend, interface kit, package manager and module (overlay folders, packages, Rust crates, options, manual steps, mobile support). Adding an option usually means adding data here plus an overlay folder. |
| `sources.json` | The upstream open-source projects the templates were derived from, pinned to commits. |

## `plans/examples/` — ready-made plans

Each file is a complete plan that the tests also generate. They cover every
profile (`electron-native`, `electron-remote`, `electron-exported`,
`tauri-native`, `tauri-remote`, `extension-basic`), every module (`electron-full`, `tauri-full`, `extension-full`),
both frontends and kits (`electron-nextjs`, `tauri-nextjs-konsta`), npm
(`electron-konsta-npm`) and mobile targets (`tauri-mobile`). Copy one, change
the name, slug and identifier, and pass it to `create`.

## `electron/`, `tauri/` and `extension/` — the three bases

All base folders have the same shape, described in the table below (the extension has no `profiles/`, because it has one profile).

| Path | Purpose |
| --- | --- |
| `template/` | A complete app with `__TOKEN__` placeholders. Includes its own `README.md`, `AGENTS.md`, tests, `.vscode/` and `.github/workflows/` (CI and release). |
| `profiles/remote/`, `profiles/exported/` (desktop bases only) | Files that replace template files for the remote (hosted web app) and, on Electron, exported (bundled static export) profiles. |
| `modules/<id>/` | One folder per module, mirroring the app's layout; copied in when the module is enabled. |
| `docs/AGENT_REFERENCE.md` | Short rules and recipes for agents working on that base. |
| `docs/reference/` | The full reference set (architecture, configuration, plugins or makers, testing, signing, release pipelines, app stores, Next.js; mobile on Tauri), written from the official documentation with sources and verification dates. Copied into every generated app as `docs/electron/`, `docs/tauri/` or `docs/extension/`. |
| `prompts/` | Base-specific prompts to paste into an agent. |
| `README.md` | What the base folder contains. |

Inside `tauri/template/`, `src-tauri/` holds the Rust core (`src/lib.rs`
start-up, `src/window.rs` windows, `src/commands.rs` core commands,
`src/error.rs` error type, `src/app_config.rs`, `src/modules/mod.rs` generated
registry), `capabilities/` (permissions), `tauri.conf.json` and
`Cargo.toml`/`Cargo.lock`. Inside `electron/template/`, `src/main/` holds the
main process, `src/preload/` the preload script and `src/renderer/` the
interface; `forge.config.ts` configures packaging. Inside `extension/template/`,
`entrypoints/` holds what the browser runs (background worker, popup, options page,
content script), `src/` the screens, components, typed messaging and settings,
`wxt.config.ts` the build and manifest, and `tests/` the Vitest and Playwright tests.

## `frontends/` and `ui/` — interface options

| Path | Purpose |
| --- | --- |
| `frontends/nextjs/root/` | Next.js App Router files (`src/app/layout.tsx`, `providers.tsx`, one `page.tsx` per route) and `postcss.config.mjs`. |
| `frontends/nextjs/renderer/lib/navigation.tsx` | Navigation built on `next/link`, replacing the Vite version. |
| `frontends/nextjs/electron/`, `frontends/nextjs/tauri/` | Base-specific `next.config.ts`; on Electron also `src/main/content.ts`, which serves the export through a private `app://` scheme and loads the Next.js dev server during development. |
| `ui/konsta/renderer/` | Konsta UI app shell (navigation bar, tab bar) and settings screen. |
| `ui/konsta/electron/`, `ui/konsta/tauri/` | Konsta UI home screen per base. |

What each overlay removes and which packages it adds or removes is recorded in
`config/catalog.json` under `frontends` and `uiKits`.

## `shared/` — used by the desktop bases and the machine check

| Path | Purpose |
| --- | --- |
| `renderer/components/ui/` | shadcn-style components (button, card, input, label, badge, separator). |
| `renderer/components/app-layout.tsx` | The default app shell with animated screen transitions. |
| `renderer/screens/settings.tsx` | The settings screen (theme). |
| `renderer/lib/navigation.tsx` | Navigation for the Vite frontend (TanStack Router). |
| `renderer/lib/utils.ts`, `renderer/styles/globals.css` | Class-name helper and design tokens (brand colors from the plan). |
| `icons/` | Default app icons (PNG, ICO, ICNS). |
| `app-scripts/doctor.mjs` | Dependency-free machine check, used by `start.sh doctor` and copied into apps as `scripts/doctor.mjs`. |

## `scripts/`

| File | Purpose |
| --- | --- |
| `bootstrap.sh` | Detects the machine (Windows in Git Bash, macOS, Linux), finds what is missing, shows a plan, asks, installs (Bun, Node.js, Git, Rust, system libraries or Visual Studio Build Tools and WebView2, optional mobile and test tools) with winget, Homebrew, apt, dnf or pacman. Also run as `bash start.sh bootstrap`. Copied into apps. |
| `bootstrap.ps1` | The same for people who prefer PowerShell on Windows. Copied into apps. |
| `generate-module-docs.ts` | Regenerates `docs/MODULES.md` from the catalog. |

## `docs/` — builder documentation

| File | Purpose |
| --- | --- |
| `REQUIREMENTS.md` | The checklist of tools per base with install commands, the install script and the accounts needed to ship. Start here on a new machine. |
| `CHOOSING_A_BASE.md` | Desktop app or browser extension, Electron or Tauri, profiles, frontends, kits, targets. |
| `SETUP_RESOURCES.md` | Every tool per operating system with official sources and install commands. Copied into apps. |
| `UI_KITS.md` | Survey of interface kits, animation and gesture libraries. Copied into apps. |
| `MANUAL_SETUP.md`, `QUICKSTART.md` (root) | Doing the setup by hand. |
| `ARCHITECTURE.md`, `CONVENTIONS.md` | How generation works; naming and code standards. |
| `MODULES.md` | Generated module list. |
| `TESTING.md`, `RELEASE_AND_SIGNING.md`, `TROUBLESHOOTING.md` | Testing, releasing and fixing problems. |
| `DOCKER.md` | The optional container. |
| `GAP_ANALYSIS.md` | What is known to be untested or missing. |
| `REPOSITORY_STRUCTURE.md` | This file. |
| `HANDOFF.md` | Current state, test results, open tasks and working rules for the next agent session. |

## `prompts/` and `skills/`

`prompts/` holds instructions a person pastes into an agent (prepare a machine,
choose a base, new app, add a module, release, troubleshoot, maintain the builder).
`skills/` holds one `SKILL.md` per job for agents that load skills; copy the
folders to `.claude/skills/` (or your agent's skill folder) to use them.

## `docker/`

`Dockerfile` and `entrypoint.sh` build an optional Linux image with Bun,
Node.js, Rust, the Tauri system libraries, packaging tools, end-to-end test
drivers and (optionally) the Android SDK, so a CI server or a machine without
those tools can generate, test and package Linux and Android builds. Windows,
macOS and iOS builds cannot be made in it. [`DOCKER.md`](DOCKER.md) explains it.

## `tests/`

`tests/unit/` checks plans, the catalog, composition, generation of every
example plan (without installing) and the module docs. `tests/generation/`
creates, installs and verifies real apps (`bun run test:generate`; the
environment variables `DSAB_PLANS`, `DSAB_E2E` and `DSAB_KEEP` select plans,
add end-to-end tests and keep the output).

## What a generated app looks like

Every generated app contains the same support folders, so a person or agent can
work in it without the builder.

| Path in the app | Purpose |
| --- | --- |
| `project-plan.json`, `.desktop-starter.json` | The resolved plan and the builder version and modules used. |
| `README.md`, `AGENTS.md` | How to run it, how it is organized, rules for agents. |
| `docs/README.md` | Index of the bundled docs: `SETUP_RESOURCES.md`, `UI_KITS.md` (desktop), and the `electron/`, `tauri/` or `extension/` reference. |
| `scripts/bootstrap.sh`, `scripts/bootstrap.ps1`, `scripts/doctor.mjs` | Install missing tools for this app's base and targets; check the machine (`bun run doctor` / `npm run doctor`). |
| `.vscode/` | Tasks (doctor, bootstrap, dev, verify, end-to-end tests, installers) and recommended extensions. |
| `.github/workflows/ci.yml`, `release.yml` | Verification on Windows, macOS and Linux for every pull request; installers (or, for an extension, store ZIP files) uploaded to a draft GitHub release when a `v*` tag is pushed. Signing steps are present and commented until their secrets exist; an extension's store submission runs only when started by hand. |
