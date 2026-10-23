# Hand-off: state of Desktop Starter App Builder and the work that remains

This document hands the repository to the next agent session or developer. It
records what the repository is, what has been tested and where, the working
rules the owner asked for, and the work that remains. Read it after
`AGENT_START.md` and before running anything. It was last updated for release
1.2.0 (2026-10-23).

## 1. What this repository is

Desktop Starter App Builder is a **reusable kit that generates projects**. A
small JSON **project plan** describes a project (name, identifier, base
framework, interface choices, optional modules), and the builder writes a
complete, tested, self-contained project into a folder outside the repository.
The builder never copies itself or its Git history into the result, and the
result needs the builder only if you want to add a module later. It is meant to
be used by people and by AI coding agents: an agent follows `AGENT_START.md`,
asks the missing questions, prepares the machine, writes and checks a plan,
generates the project and proves it works.

Three **bases** are supported:

1. **Electron** (Chromium plus Node.js, packaged with Electron Forge), for large,
   long-lived desktop products.
2. **Tauri 2** (the operating system's web view plus a Rust core), for lean,
   fast desktop apps and proofs of concept; it can also target Android and iOS.
3. **Browser extension** (WXT, React, Tailwind CSS), a Manifest V3 add-on for
   Chrome, Edge and Firefox, for products that live inside the browser.

The builder is a TypeScript program run by Bun (`cli/main.ts`), entered through
`start.sh` (Git Bash, macOS, Linux) or `start.ps1` (PowerShell).
`docs/REPOSITORY_STRUCTURE.md` describes every folder and file, and
`docs/REQUIREMENTS.md` lists exactly what a machine needs for each base.

Phone and tablet apps built with Expo (React Native) are **not** part of this
repository. They belong to the separate Mobile Starter App Builder repository,
which is maintained on its own. This repository can build Android and iOS apps
only through Tauri 2.

The version in `package.json` is 1.2.0; `CHANGELOG.md` lists what each version
added. The Git repository has an `origin` remote on GitHub and uses `main`.

## 2. The owner's working rules

The rules below come from the repository's owner and apply to every step. They
take precedence over convenience.

1. **Check before installing.** Never assume a tool is missing. Run the
   read-only check (`bash start.sh doctor --base <base>`, or the tool's
   `--version`) first, and propose installing only what the check reports as
   missing or too old. Ask before installing system software.
2. **Git Bash is the shell on Windows.** Run builder commands there
   (`bash start.sh ...`). PowerShell support stays for other people.
3. **Ask before anything irreversible or external.** Committing, pushing,
   publishing a release, signing, store submission and installing system
   software each need the owner's approval for that specific action. (The owner
   asked for the release 1.2.0 work to be merged into `main` and pushed.)
4. **Never assume intent.** When a request can be read more than one way, ask
   before doing the work; label any recommendation as non-binding.
5. **Define terms on first use**, write documents in connected prose that
   introduces every list and table, and never put the owner's name or any
   author attribution into files (refer to "the owner" or "the user").
6. **No time estimates** of any kind.
7. **Never fabricate.** Mark anything not verified as **UNVERIFIED**; include a
   URL in a document only after opening it and confirming it is the right page.
8. **Fix the builder, not only the output.** When a generated project fails, fix
   the cause in the builder's templates or code, run `bun run verify` in the
   builder, and regenerate to prove the fix.
9. **Keep the history readable.** Work on a branch, commit in logical pieces
   with a message that says what changed, why, and what was and was not
   verified, then merge into `main` with a merge commit.

## 3. What exists

1. **Builder commands**: `bootstrap`, `doctor`, `list`, `module list|show|add`,
   `plan new|check`, `new`, `create`, `setup`, `verify`, `run`, `release`,
   `upstream`.
2. **Plan options**: `base`, `profile`, `frontend`, `ui` and `uiTheme`,
   `packageManager`, `targets`, `modules`, `moduleOptions`, `theme`,
   `repository`. Plan validation is per base (an extension accepts only the
   `vite` frontend and the `shadcn` kit, and builds for the `browser` target).
3. **Modules**: `database`, `secure-storage`, `auth-oidc`, `auto-update`,
   `filesystem`, `background`, `crash-reporting` (desktop); `side-panel`,
   `context-menu`, `content-ui` (extension); recipes `database-prisma` and
   `peer-to-peer`.
4. **Self-contained generated projects**: README, `AGENTS.md`, `docs/` (setup,
   the base's full reference), `scripts/bootstrap.sh`, `scripts/bootstrap.ps1`,
   `scripts/doctor.mjs`, `.vscode/` tasks and `.github/workflows/` (CI and
   release), plus a fresh Git repository with no remote and no commit.
5. **Machine preparation**: `docs/REQUIREMENTS.md` (the checklist),
   `bootstrap` scripts (install after showing a plan and asking),
   `doctor` (read-only), and the agent prompt `prompts/setup-machine.md`.
6. **Reference documentation**: `tauri/docs/reference/` (18 pages),
   `electron/docs/reference/` (8 pages), `extension/docs/reference/` (8 pages
   plus `AGENT_REFERENCE.md`), `docs/SETUP_RESOURCES.md`, `docs/UI_KITS.md`.
7. **Agent material**: `AGENT_START.md`, 14 skills in `skills/`, prompts in
   `prompts/` and in each base's `prompts/` folder.
8. **Docker**: `docker/Dockerfile` (optional Android layer), `docker/entrypoint.sh`,
   `compose.yaml`; see `docs/DOCKER.md`.

## 4. What was tested, and where

`docs/TESTING.md` ("What was verified, and where") lists every executed run.
In short:

1. **Windows 11 (Git Bash)**: builder `verify` (95 tests); all 11 desktop
   example plans generated, installed, verified and end-to-end tested; both
   extension example plans (and an npm variant) verified, built for Chrome and
   Firefox, zipped and end-to-end tested in Chromium; `module add` on an
   existing extension; Windows installers built (Electron Squirrel, Tauri MSI
   and NSIS), unsigned and not installed; `bootstrap.sh` really installed
   `tauri-driver` and the matching `msedgedriver`; `bootstrap.ps1` ran under
   Windows PowerShell 5.1 (dry runs and the driver download).
2. **Linux in Docker (Debian 12)**: the image builds with and without the
   Android layer; `doctor` passes; the extension, Electron and Tauri examples
   generate, verify and pass end-to-end tests inside it; and the `tauri-mobile`
   example builds an unsigned Android APK and AAB.
3. **Ubuntu 24.04 (earlier session)**: every desktop example plan, and Linux
   installers.

Nothing has run on macOS, iOS or GitHub Actions, and no installer was
installed or launched, signed, or submitted to a store.

## 5. Open work, in a sensible order

The defects found in the first Windows and Docker runs are fixed
(`docs/GAP_ANALYSIS.md`, "Gaps found by the first Windows and Docker runs"). What
remains falls into three groups.

### A. Needs another machine or account

1. **macOS**: run `bash start.sh doctor --base <base>`, then generate and test
   the example plans (`tauri-full` needs the WebdriverIO Tauri service for end-to-end
   tests on macOS, which is not set up), then try iOS with `ios:init`, `ios:build`
   and `ios:dev` on `plans/examples/tauri-mobile.json`.
2. **GitHub Actions**: push, then check that the builder's `ci.yml` and a
   generated project's `ci.yml` pass on all three operating systems. `release.yml`
   runs on a `v*` tag and creates a draft release; an extension's store
   submission runs only when started by hand.
3. **Signing and stores**: Windows certificate, Apple Developer account, Android
   keystore, Tauri updater key pair, and the Chrome Web Store, Firefox Add-ons and
   Edge Add-ons accounts (`docs/REQUIREMENTS.md`, "What you need to ship"). The
   release workflows contain the signing steps commented until the secrets exist.
4. **Install and launch the built installers** on a clean machine, and sign them.

### B. Code work not yet done

5. **Android on a device**: the `tauri-mobile` example builds an APK and AAB in
   Docker (`docs/GAP_ANALYSIS.md`, "Android in Docker"), but `android:dev` on an
   emulator has not been run. Mobile versions of the `secure-storage`,
   `auth-oidc` and `filesystem` modules are not written; only `database` is
   marked mobile-capable.
6. **Crash reporting for Tauri and for extensions** (the community `sentry-tauri`
   plugin is only documented).
7. **Extension polish**: decide whether Firefox should build as Manifest V3
   (`extension/docs/reference/06-browsers-and-cross-browser.md`), apply WXT's
   PostCSS fix for `rem` units inside page overlays, add Safari packaging.
8. **Konsta UI gaps** (module panels use shadcn components; brand color not set
   from the plan) and other interface kits listed in `docs/UI_KITS.md`.
9. **Tauri remote-profile end-to-end test** only proves the window opened when
   the hosted site is unreachable; add a local test server for a stronger check.
10. **Next.js** is offered only with the native profile.

### C. Decisions for the owner

11. How the Tauri mobile targets in this repository relate to the Mobile Starter
    App Builder's own Tauri 2 generator, which overlaps them. Until decided, keep
    them as they are and do not copy code between the repositories.
12. Whether to rename the repository, because it now generates browser
    extensions as well as desktop apps (the command and folder names would not
    change).

## 6. Where problems are most likely

These are judgments from the code and the runs, not observed failures.

1. **Version drift in upstream tools.** The templates pin major versions with
   `^`. WXT, Electron, Tauri, Playwright and Biome move quickly; a fresh
   `bun install` can pull a minor release that breaks lint or types. The generated
   projects' lint is strict, so any template edit must be formatted with the
   projects' Biome settings (`CONTRIBUTING.md`, "Development loop").
2. **Windows PATH and version managers.** Tools installed after a terminal opened
   are not on its PATH; Node.js under nvm-windows, Bun under `~/.bun/bin` and Rust
   under `~/.cargo/bin` are the usual cases (`docs/TROUBLESHOOTING.md`).
3. **`msedgedriver` drift.** Edge updates itself, so a driver that matched
   yesterday can fail today; `doctor --e2e` reports the mismatch and the
   bootstrap scripts download the matching one.
4. **Extension store rules.** Store policies and the `wxt submit` credential names
   change; the publishing page is dated and marks what it could not confirm.
5. **Next.js frontends** depend on Tauri hashing inline scripts into the content
   security policy and on Electron serving the export from `app://`. A blank window
   in a packaged Next.js project usually means a blocked script or a 404 in the
   developer console.

## 7. Definition of done for a session

A session is done when: every change is on a branch, committed in logical pieces
and merged into `main` with a clear merge commit; `bun run verify` passes in the
builder; any template or module change was proved by generating a project and
running its own `verify` (and its end-to-end tests where a window can run);
`docs/GAP_ANALYSIS.md`, `docs/TESTING.md` and this file say only what was actually
run; and nothing was signed, published or submitted without the owner's approval.
