# Desktop Starter App Builder

Desktop Starter App Builder is a reusable generator for desktop applications
(and, with Tauri, Android and iOS apps). You describe an application in a small
JSON **project plan** (its name, identifier, framework, interface style and the
optional **modules** it needs), and the builder fills a new folder with a
complete, tested, self-contained application: code, tests, setup scripts,
reference documentation, VS Code tasks and GitHub Actions workflows. A person
can drive it from the command line, and an AI coding agent in VS Code can drive
it by following [`AGENT_START.md`](AGENT_START.md). The builder never copies
itself (or its Git history) into the application, so the same checkout produces
any number of apps.

## Two ways to use this repository

This repository supports two modes of work, and it helps to know which one you
are in before running anything.

1. **Clean-slate mode: create a new app somewhere else.** This is the usual
   case. You give the builder a destination folder as a full path (for example
   `C:\Users\me\Projects\acme-notes`) or a relative one (`../acme-notes`). The
   app is generated there with its **own new Git repository** (no remote, no
   link to this one), so you track its history your own way. The new folder
   carries everything needed to keep working without the builder: `README.md`,
   `AGENTS.md` for coding agents, `docs/` (setup, plugins, signing, release
   pipelines, app stores, mobile), `scripts/bootstrap.sh` and
   `scripts/bootstrap.ps1` (install missing tools; the `.sh` one also works in
   Git Bash on Windows), `scripts/doctor.mjs`
   (check the machine), `.vscode/` tasks and `.github/workflows/` (CI and
   release). Open the new folder in its own editor window and work there.
2. **Contributing mode: improve the builder itself.** Clone or fork this
   repository, change templates, modules or docs, and prove the change with
   `bun run verify`. [`CONTRIBUTING.md`](CONTRIBUTING.md) explains how.

## Example: starting a football-scores app

This repository is a kit you draw from, not a place where apps are built. A
typical session with an agent in VS Code, opened on this folder, goes like this.

1. You say what you want: "an app that shows live football scores from my API,
   in `C:\football-scores`".
2. The agent reads [`AGENT_START.md`](AGENT_START.md) and asks only what it
   cannot infer. The key question is the scope: is this a quick prototype
   (lean, fast to spin up, small installer: **Tauri**) or a full product that
   will keep growing, with the biggest library ecosystem, background work and
   enterprise integrations (**Electron**)? It also asks whether the app must run
   on a phone (**Tauri** can build Android and iOS), which interface look you
   want, and which modules you need.
3. It checks the machine, writes a plan file, shows it to you, and waits for
   your approval.
4. It copies exactly what that base needs into `C:\football-scores`: the app,
   its tests, its setup scripts, its reference documentation, its VS Code tasks
   and its GitHub Actions workflows. The new folder gets its own empty Git
   repository, with no link to this one.
5. From then on you work in `C:\football-scores` on its own: the agent installs
   dependencies, verifies the baseline, starts the app, lists the project's
   scope with you, and you begin building screens and wiring the API.

You can do every step yourself with the commands in
[`QUICKSTART.md`](QUICKSTART.md); the agent only follows the same commands.

## Electron or Tauri

Two **bases** (the underlying desktop frameworks) are supported. In short,
Electron suits apps that will grow into large, long-lived products, and Tauri
suits lean, fast apps, proofs of concept and anything that must also run on
Android or iOS. [`docs/CHOOSING_A_BASE.md`](docs/CHOOSING_A_BASE.md) gives the
full decision rule.

- **Electron** bundles the Chromium browser engine and Node.js with the app.
  The native side is TypeScript running on Node, so any npm package works, and
  the interface renders identically on every operating system. It has the
  largest ecosystem for complex integrations. Packaging uses Electron Forge.
- **Tauri 2** uses the web view built into the operating system and a compiled
  Rust core. Installers are small and memory use is low; native code is Rust,
  every capability must be granted explicitly, and the same project can also
  build Android and iOS apps.

## Related builders

This repository covers desktop applications, and Android and iOS through
Tauri 2. Two sibling repositories follow the same idea (a reusable kit that
generates a project somewhere else): **Mobile Starter App Builder**, for
phone and tablet apps built with Expo (React Native) or Tauri 2, and **Browser
Extension Starter App Builder**, for browser extensions. At the time of this
release the mobile builder has its own generators and history, and the
extension builder is an empty repository with no content yet. They are not
part of this repository; use the one that matches the product you are building.

## What a generated app contains

Every generated app, on either base, starts with the same foundation, and the
plan chooses the options listed after it.

1. A React + TypeScript interface with Tailwind CSS 4, home and settings
   screens, a light/dark theme, animated screen transitions (Motion) and touch
   gestures (@use-gesture) installed.
2. A typed bridge between the interface and the native side (oRPC with Zod
   validation on Electron; typed command wrappers on Tauri).
3. Secure defaults: an isolated, sandboxed interface on Electron with build-time
   security fuses; deny-by-default permissions and a content security policy on Tauri.
4. Single-instance handling, deep links on the app's own URL scheme, logging,
   saved window size and position, and stored preferences.
5. A quality gate (`verify`: type check, lint and format check, unit tests, and
   Rust tests on Tauri), end-to-end tests that launch the real app, and
   installer builds.
6. Self-contained support files: `README.md`, `AGENTS.md`, `docs/`,
   `scripts/` (bootstrap and doctor), `.vscode/` tasks and recommended
   extensions, and `.github/workflows/` for CI and releases.

The plan's options are these:

| Plan field | Choices | Default |
| --- | --- | --- |
| `frontend` | `vite` (React + Vite) or `nextjs` (Next.js App Router, static export) | `vite` |
| `ui` / `uiTheme` | `shadcn` (desktop look) or `konsta` with `ios` or `material` (native mobile look) | `shadcn` |
| `packageManager` | `bun` or `npm` | `bun` |
| `targets` | `desktop`, plus `android` and `ios` on Tauri | `desktop` |
| `modules` | local SQLite database, secure credential storage, OpenID Connect sign-in, automatic updates, native file dialogs, tray and background work, crash reporting | none |

[`docs/MODULES.md`](docs/MODULES.md) lists the modules with their packages and
options, and [`docs/UI_KITS.md`](docs/UI_KITS.md) compares interface kits,
animation and gesture libraries.

## Quick start

The builder needs **Bun** 1.3 or newer and **Git**. Electron apps also need
Node.js 22.17 or newer; Tauri apps need Rust and the operating system's web
view development files. The bootstrap scripts install whatever is missing after
showing you a plan and asking; `doctor` only checks.

```bash
# 1. Prepare the machine. It detects Windows (Git Bash + winget), macOS or Linux,
#    shows a plan and asks before installing; add --dry-run to only look.
bash start.sh bootstrap --base tauri
bun install
bash start.sh doctor --base tauri

# 2. Create an app in one step (asks for anything you leave out)
bash start.sh new ../acme-notes --name "Acme Notes" --base tauri --frontend vite --ui konsta --ui-theme ios --modules database --install --verify

# 3. Work in the new app
cd ../acme-notes && bun run dev
```

On Windows, run the same commands in Git Bash (the recommended shell here). PowerShell
users can replace `bash start.sh` with `.\start.ps1`. To keep the plan as a file and review it before
generating, use `plan new` and `create` instead of `new` (see
[`QUICKSTART.md`](QUICKSTART.md)). [`docs/SETUP_RESOURCES.md`](docs/SETUP_RESOURCES.md)
lists every tool with manual install steps for each operating system.

## Using it with an AI agent

Open the builder folder in VS Code and give your agent a prompt from
[`prompts/`](prompts/). For example, paste
[`prompts/new-app.md`](prompts/new-app.md) and fill in the blanks. The agent
reads `AGENT_START.md`, asks about the app's scope and the decisions it needs,
checks the machine, writes the plan, waits for your approval, generates and
verifies the app in the folder you named, and reports exactly what it ran.
VS Code users can also run the builder's tasks from **Terminal → Run Task**
(defined in `.vscode/tasks.json`). Inside a generated app, point the agent at
that app's `AGENTS.md`.

## Commands

All commands are run from the builder root as `bash start.sh <command>` (or
`.\start.ps1 <command>`). The table below lists them in the order they are
normally used.

| Command | Purpose |
| --- | --- |
| `doctor [--base B] [--mobile] [--e2e]` | Read-only check of the tools this machine needs; prints the fix for anything missing. |
| `list` | Bases, profiles and the rule for choosing between them. |
| `module list [--base B]`, `module show ID` | Optional modules, their packages, options and manual steps. |
| `plan new --out FILE [plan flags]`, `plan check FILE` | Write a plan (asks for missing values in a terminal) or validate one. |
| `new TARGET [plan flags] [--install] [--verify]` | Clean-slate mode in one step: build the plan from flags and create the app. |
| `create TARGET --plan FILE [--install] [--verify]` | Generate the app from a plan file into a new or near-empty folder. |
| `setup TARGET` | Install packages with the app's package manager and create `.env` from `.env.example`. |
| `verify TARGET` | Run the app's quality gate. |
| `run TARGET [dev\|test\|e2e]` | Start development mode or run tests. |
| `module add ID TARGET [--option k=v]` | Add a module to a generated app, then install and verify. |
| `release TARGET [--publish] [--yes]` | Verify, then build installers; publishing needs confirmation. |
| `upstream check\|fetch` | Compare or fetch the pinned upstream projects the templates came from. |

Plan flags are `--name`, `--slug`, `--app-id`, `--base`, `--profile`,
`--remote-url`, `--frontend`, `--ui`, `--ui-theme`, `--package-manager`,
`--targets`, `--modules`, `--repository` and `--author`.

## Repository map

The top-level folders are summarized below;
[`docs/REPOSITORY_STRUCTURE.md`](docs/REPOSITORY_STRUCTURE.md) describes every
folder and file.

| Path | Contents |
| --- | --- |
| `cli/` | The builder program (TypeScript on Bun): commands and the composition logic. |
| `config/` | `catalog.json` (bases, profiles, frontends, interface kits, modules as data) and `sources.json` (pinned upstream projects). |
| `plans/examples/` | Ready-to-copy project plans for every base, profile, frontend and interface kit. |
| `electron/`, `tauri/` | Each base's template, profiles, modules, reference docs (`docs/reference/`) and prompts. |
| `frontends/` | The Next.js frontend overlay for both bases. |
| `ui/` | The Konsta UI interface-kit overlay for both bases. |
| `shared/` | Interface components, layout, design tokens, icons and the `doctor.mjs` machine check used by both bases. |
| `scripts/` | `bootstrap.sh` (detects Windows in Git Bash, macOS or Linux and installs missing tools; also `bash start.sh bootstrap`), `bootstrap.ps1` (the same for PowerShell users) and the module-docs generator. |
| `prompts/`, `skills/` | Instructions to paste into an AI agent, and one skill file per job. |
| `docs/` | Choosing a base, architecture, modules, setup resources, UI kits, testing, release, Docker, troubleshooting. |
| `docker/`, `compose.yaml` | An optional Linux container with every tool installed, for CI or for building Linux and Android packages without installing toolchains on your machine. |
| `tests/` | Builder unit tests and the full generation test. |

## Developing the builder

Run `bun install` once, then `bun run verify` after every change (type check,
lint, unit tests, a catalog-consistency check and a generation dry run of every
example plan). `bun run test:generate` creates, installs and verifies real
apps from the example plans; it installs packages and, for Tauri, compiles
Rust. [`CONTRIBUTING.md`](CONTRIBUTING.md) explains how to add a module,
profile, frontend or interface kit.

## License

MIT, see [`LICENSE`](LICENSE). Generated apps include
`THIRD_PARTY_NOTICES.md` crediting the MIT-licensed projects their structure
was adapted from.
