# Agent start: Desktop Starter App Builder

This is the entry point for an AI coding agent (Claude Code, Codex, GitHub
Copilot, Cursor or any agent that can run shell commands). Read it before
running any command. It defines what the builder is, the decisions to collect
from the user, the gated sequence for producing an application, and the rules
that apply throughout.

## Mission

Desktop Starter App Builder is a reusable **generator**: it fills a new or
nearly empty folder with a complete desktop application built on **Electron**
or **Tauri 2**, or with a **browser extension** (Chrome, Edge, Firefox) built
on WXT, with secure defaults, a typed bridge between the interface and the
native side, optional modules, tests and packaging already working. The
builder repository itself is never copied into the application and never
modified while generating one, so it can be reused for the next app.

An agent's job is to turn the user's intent into a **project plan** (one JSON
file), generate the app from it, prove the result works with the app's own
checks, and hand off with an exact report.

## Two modes of work

Decide which mode the user wants before running anything, because the rules differ.

1. **Clean-slate mode (the usual case): create an app somewhere else.** The builder generates a new, self-contained project in a folder the user names (a full path such as `C:\Users\me\Projects\acme-notes` or a relative one such as `../acme-notes`). The new folder gets its own fresh Git repository with no remote and no link to this repository, its own `README.md`, `AGENTS.md`, reference docs (`docs/`), setup scripts (`scripts/bootstrap.sh`, `scripts/bootstrap.ps1`, `scripts/doctor.mjs`), VS Code tasks and GitHub Actions workflows. After generation, all further work happens in the new folder; open it in its own editor window. Nothing from this repository's `.git` folder is ever copied.
2. **Contributing mode: change the builder itself.** The user wants to fix a template, add a module or improve the docs of this repository. Work inside this repository, follow `AGENTS.md` and `CONTRIBUTING.md`, and prove changes with `bun run verify` here. Never mix the two modes in one task.

## Read order

1. This file, then `docs/HANDOFF.md` (current state, open tasks and the user's working rules).
2. `README.md` for the repository map and command list; `docs/REPOSITORY_STRUCTURE.md` for every folder and file.
3. `docs/CHOOSING_A_BASE.md` before recommending Electron or Tauri.
4. `docs/MODULES.md` for the modules the user is considering, or `bash start.sh module show <id>`.
5. `docs/UI_KITS.md` when the user cares about the look (native iOS/Material style, animation, gestures).
6. `docs/REQUIREMENTS.md` (the exact tool list per base, the install script and the accounts needed to ship) and, for detail, `docs/SETUP_RESOURCES.md` when `doctor` reports missing tools. To prepare a machine use `prompts/setup-machine.md`.
7. The base's reference only when you need detail: `electron/docs/reference/00-index.md`, `tauri/docs/reference/00-index.md` (plugins, signing, release pipelines, app stores, mobile) or `extension/docs/reference/00-index.md` (permissions, messaging, content scripts, testing, store publishing).
8. In an existing generated app: its `AGENTS.md`, `docs/README.md`, `project-plan.json` and `.desktop-starter.json`.

## Running the builder

All commands run from the builder's root folder. On Windows use Git Bash with
`bash start.sh ...` (preferred), or PowerShell with `.\start.ps1 ...`; both call the same
Bun program (`cli/main.ts`). Every command prints `==>` headings, `ok` lines
for success and `error:` lines for failures, and exits non-zero on failure.

## Decisions to collect from the user

Ask only for what cannot be inferred, and ask before generating. The plan
fields each decision fills are shown in brackets.

1. **Scope and size of the app** (no plan field; it decides the base). Ask: Is this a proof of concept or a product that will keep growing? Roughly how large will it get (screens, integrations, team size)? Does it need Node.js libraries, native Node modules or heavy integrations (databases, SDKs, enterprise sign-in, background jobs)? Must it also run on Android or iOS? Do installer size and memory use matter?
2. **Identity** — display name [`name`], folder/package name [`slug`], reverse-DNS identifier such as `com.company.app` [`appId`], link scheme for deep links [`scheme`, defaults to the slug without hyphens], author [`author`], one-line description [`description`].
3. **Base** [`base`] — Electron, Tauri or `extension`. First decide whether the product is a desktop app or lives inside the browser (see "First question" in `docs/CHOOSING_A_BASE.md`): choose `extension` for something the user does while browsing (page tools, toolbar button, side panel, right-click action) and a desktop base for anything that needs its own window, files or devices. For a desktop app apply the decision rule in `docs/CHOOSING_A_BASE.md` to the answers from step 1 and state which rule decided it. This repository's default guidance: **Electron** for apps expected to grow into large, long-lived products (enterprise features, the biggest ecosystem, complex integrations, identical rendering everywhere); **Tauri** for lean, fast apps and proofs of concept, and whenever Android or iOS is a real goal (Tauri is production-capable too; it trades the Node ecosystem for size and speed). Present the result as a non-binding proposal and let the user decide.
4. **Profile** [`profile`, `remoteUrl`, `allowedOrigins`] — an extension has one profile (`extension`) and needs no answer. For desktop apps, what the window shows: `native` (bundled interface), `remote` (a web app the user already hosts) or, Electron only, `exported` (a static web export the user already has, bundled for offline use).
5. **Frontend** [`frontend`, native profile only; extensions are `vite` only] — `vite` (React + Vite, the default, simplest and fastest) or `nextjs` (Next.js App Router exported to static files; for teams that work in Next.js; server features such as server actions, route handlers, middleware and image optimization do not exist in a desktop app).
6. **Interface kit** [`ui`, `uiTheme`; extensions are `shadcn` only] — `shadcn` (default; accessible, restylable, desktop look) or `konsta` (native iOS or Material Design look, with `uiTheme` `ios` or `material`). Motion (animation) and @use-gesture (touch and drag gestures) are installed with both. `docs/UI_KITS.md` lists every other kit the user may prefer to add by hand.
7. **Package manager** [`packageManager`] — `bun` (default) or `npm`. The app's scripts, docs and workflows are written for the one chosen.
8. **Targets** [`targets`, Tauri only; an extension's target is always `browser`] — `desktop` always; add `android` and/or `ios` for mobile. Mobile allows only modules marked mobile-capable (`database` today) and the native profile; iOS builds need a Mac with Xcode.
9. **Modules** [`modules`, `moduleOptions`] — only those the product needs, chosen from `bash start.sh module list --base <base>` (extension modules: `side-panel`, `context-menu`, `content-ui`; for an extension also confirm the narrowest set of sites and browser permissions it needs, because the stores review them). Collect each selected module's required options (for example the sign-in issuer and client id).
10. **Brand** [`theme`] — primary color, its foreground, accent and corner radius, as CSS values. Defaults are acceptable.
11. **Repository** [`repository`, optional] — `owner/name` on GitHub, needed for publishing and the Electron GitHub update source.
12. **Target folder** — where the app should be created, as a full or relative path. It must be outside the builder, and either missing, empty, or containing only `.git`, `README.md`, `LICENSE`, `.gitignore` or `.gitattributes`.

## Required sequence

Run these gates in order. Do not merge gates, and stop at the first failure.

1. **Host check.** `bash start.sh doctor --base <base>` (base: `electron`, `tauri` or `extension`; add `--mobile` for Android/iOS targets, `--e2e` for end-to-end test drivers). If a required tool is missing, report the exact fix line it printed. With the user's approval, run `bash start.sh bootstrap --base <base> --dry-run` to show what would be installed, then the same command without `--dry-run` once the user agrees. It detects the machine itself: on Windows it runs in Git Bash and installs with winget; on macOS it uses Homebrew and the official installers; on Linux apt, dnf or pacman. (`scripts/bootstrap.ps1` is the PowerShell equivalent for users who prefer PowerShell.) Never install system software without the user's approval.
2. **Plan.** Write the plan with `bash start.sh plan new --out <file> --name ... --base ... --frontend ... --ui ... --modules ...` or by copying a file from `plans/examples/` and editing it. Then run `bash start.sh plan check <file>` and show the resolved plan to the user (it lists defaults and modules added automatically because another module requires them).
3. **Approval.** Get the user's approval of the resolved plan before generating, because the identifier and scheme are awkward to change later.
4. **Generate.** `bash start.sh create <target> --plan <file>`. (`bash start.sh new <target> --name ... --base ... [plan flags]` does steps 2 and 4 in one command when the user has already approved the choices.)
5. **Install.** `bash start.sh setup <target>`.
6. **Baseline gate.** `bash start.sh verify <target>`. If it fails, diagnose and fix the cause before doing anything else; do not continue on a failing baseline.
7. **End-to-end gate** (when the machine can run a window; browser extensions run headless Chromium and need no display). From the app folder: `bun run test:e2e` or `npm run test:e2e` (Linux without a display: prefix `xvfb-run -a`; Tauri also needs `tauri-driver`). If the environment cannot run it, say so in the hand-off instead of skipping silently. Mobile targets: tell the user to run `android:init` / `ios:init` and then `android:dev` / `ios:dev` on a machine with the mobile SDKs (`docs/tauri/14-mobile.md` in the app).
8. **Manual steps.** Print the manual steps of every enabled module (`bash start.sh module show <id>`) and tell the user which ones they must do themselves (identity provider settings, signing certificates, update keys).
9. **Hand-off.** Report, in this order: the plan file path, the target path, the base, profile, frontend, interface kit, package manager, targets and modules, every command you ran with its result, the outstanding manual steps (including code signing and store accounts from the app's `docs/<base>/` signing and store pages when the user plans to ship, and for an extension the Chrome Web Store, Firefox Add-ons and Edge Add-ons accounts), and anything you could not verify. Tell the user to open the new folder on its own from now on.

To add a module to an app the builder generated earlier, use
`bash start.sh module add <id> <target> [--option key=value]`. It copies the
module, updates the generated registry files, installs and runs the app's
verification. Never copy module files by hand.

## Rules

1. **Never modify the builder while generating an app.** Changes to the builder itself (new modules, template fixes) are a separate task with its own tests (`bun run verify` in the builder root).
2. **Never overwrite user work.** `create` refuses non-empty targets; do not delete files to get around that. For existing apps use `module add`.
3. **Never put secrets in the plan, `app.config.json`, source files or the interface.** Plans and `app.config.json` are shipped with the app.
4. **Never weaken security defaults** (Electron context isolation, sandbox, fuses and navigation rules; Tauri capabilities and CSP) unless the user explicitly asks and you explain the consequence.
5. **Publishing, signing, store submission and pushing to a remote require the user's explicit approval for that specific action.** `bash start.sh release <target>` builds installers locally; `--publish` uploads and asks for confirmation.
6. **Report facts, not assumptions.** If a step was not run or a check could not be performed, say so plainly.
7. **Keep the user's terms.** Use the plan's names and identifiers exactly; do not rename things the user chose.

## Prompts and skills

`prompts/` holds ready-made instructions a person can paste into an agent
(for example `prompts/setup-machine.md` to prepare a computer and `prompts/new-app.md` to create a project). `skills/` holds one instruction
file per job (intake, generation, adding a module, release, troubleshooting)
for agents that load skills. Both follow this file; if they ever disagree,
this file wins.

## Definition of done

An application is done when: it was generated from an approved plan; its Git
repository is independent of the builder; `bash start.sh verify <target>`
passes; the end-to-end tests pass or the reason they could not run is
reported; every enabled module's manual steps are listed for the user; and the
hand-off report is complete. Publishing a release is a separate milestone.
