# Hand-off: state of Desktop Starter App Builder and the work that remains

This document hands the repository to the next agent session (for example
Claude Code running on the user's Windows machine). It records what the
repository is, what was built and how it was tested, the user's working
rules, every open task with exact steps, and an analysis of the risks. Read it
after `AGENT_START.md` and before running anything.

## 1. What this repository is

Desktop Starter App Builder is a generator for desktop applications. A small
JSON **project plan** describes an app (name, identifier, base framework,
interface choices, optional modules), and the builder writes a complete,
tested, self-contained app into a folder outside the repository. Two **bases**
(desktop frameworks) are supported: **Electron** (Chromium plus Node.js,
packaged with Electron Forge) and **Tauri 2** (the operating system's web view
plus a Rust core). The builder is a TypeScript program run by Bun
(`cli/main.ts`), entered through `start.sh` (Git Bash, macOS, Linux) or
`start.ps1` (PowerShell). `docs/REPOSITORY_STRUCTURE.md` describes every
folder and file.

The repository lives at
the folder where it was checked out. Its Git repository has an `origin`
remote on GitHub; see section 8 for the commit and push state. The
version in `package.json` is 1.1.0 and `CHANGELOG.md` lists what each version
added.

## 2. The user's working rules

The rules below come from the user and apply to every step. They take
precedence over convenience.

1. **Check before installing.** Never assume a tool is missing. Run the
   read-only check (`bash start.sh doctor --base <base>`, or the tool's
   `--version`) first, and propose installing only what the check reports as
   missing or too old. Bun 1.4.4 is already installed on this machine.
2. **Git Bash is the shell on Windows.** Run every command in Git Bash
   (`bash start.sh ...`). PowerShell support stays in the repository for other
   people, but do not use it for this user's work.
3. **Ask before anything irreversible or external.** Committing, pushing,
   publishing a release, signing, store submission and installing system
   software each need the user's explicit approval for that specific action.
4. **Never assume intent.** When a request can be read more than one way, ask
   before doing the work. List options and let the user choose; label any
   recommendation as non-binding.
5. **Define terms on first use**, write documents in connected prose that
   introduces every list and table, and never put the user's name or any
   author attribution into files (refer to "the user").
6. **No time estimates** of any kind.
7. **Never fabricate.** Mark anything not verified as **UNVERIFIED**; include
   a URL in a document only after opening it and confirming it is the right
   page.
8. **Fix the builder, not only the output.** When a generated app fails, fix
   the cause in the builder's templates or code, run `bun run verify` in the
   builder, and regenerate to prove the fix.

## 3. What was built

The repository contains the following, all described in more detail in
`README.md`, `AGENT_START.md` and `docs/`.

1. **Builder commands**: `bootstrap` (detects Windows in Git Bash, macOS or
   Linux and installs missing tools after asking), `doctor` (read-only machine
   check), `list`, `module list|show|add`, `plan new|check`, `new` (plan from
   flags and create in one step), `create`, `setup`, `verify`, `run`,
   `release`, `upstream`.
2. **Plan options**: `base` (electron, tauri), `profile` (native, remote,
   exported on Electron), `frontend` (vite, nextjs), `ui` and `uiTheme`
   (shadcn, or konsta with ios or material), `packageManager` (bun, npm),
   `targets` (Tauri: desktop plus android and ios), `modules`,
   `moduleOptions`, `theme`, `repository`.
3. **Modules**: database, secure-storage, auth-oidc, auto-update,
   filesystem, background (both bases), crash-reporting (Electron), plus two
   documented recipes (database-prisma, peer-to-peer). Only `database` is
   allowed with Android/iOS targets.
4. **Self-contained generated apps**: each app gets its own Git repository
   (no remote, no commit), `README.md`, `AGENTS.md`, `docs/` (setup
   resources, the base's full reference, UI kits), `scripts/bootstrap.sh`,
   `scripts/bootstrap.ps1`, `scripts/doctor.mjs`, `.vscode/` (tasks, Git Bash
   as the terminal and task shell, recommended extensions) and
   `.github/workflows/ci.yml` and `release.yml`.
5. **Reference documentation**: `tauri/docs/reference/` (18 files: setup,
   configuration, security, IPC, plugins, the plugin catalog with when and why,
   distribution, testing, recipes, signing, pipelines, stores, mobile, mobile
   plugins, architecture, Next.js); `electron/docs/reference/` (8 files:
   architecture, makers, signing, publishing and updates, app stores, Next.js,
   testing); `docs/SETUP_RESOURCES.md` (every tool per operating system with
   verified package IDs); `docs/UI_KITS.md` (24 interface kits and 13
   animation and gesture libraries).
6. **Docker**: an optional Linux image (`docker/Dockerfile`) for CI or for
   Linux and Android builds without installing toolchains; Android is added
   with `--build-arg WITH_ANDROID=true`.

## 4. What was tested, and where

All testing so far happened in a Linux (Ubuntu 24.04) cloud workspace, not on
the user's machine. The list below states exactly what passed there.

1. Builder: `bun run verify` passes (type check, Biome lint, 70 unit tests,
   module-docs check, generation dry run of all 11 example plans).
2. Generated apps: every example plan in `plans/examples/` was generated,
   installed, verified (type check, lint, unit tests, and Rust tests for
   Tauri) and end-to-end tested on Linux with `xvfb-run`:
   electron-native, electron-remote, electron-exported, electron-full,
   electron-nextjs, electron-konsta-npm (npm), tauri-native, tauri-remote,
   tauri-full, tauri-nextjs-konsta, tauri-mobile (desktop build only).
3. Electron `make` produced `.deb` and `.zip` installers; a Tauri release
   build produced a `.deb` (an earlier pass).
4. Bootstrap: `bash -n` and shellcheck pass; dry runs were correct on Linux,
   simulated macOS and simulated Windows (Git Bash, with stand-ins for
   winget, reg, setx and cygpath); the Windows branch also ran a mocked
   install sequence. PowerShell bootstrap: parses cleanly and dry-runs under
   PowerShell 7 on Linux.
5. A separate review pass found eight defects, all fixed and re-tested (for
   example, the bootstrap mistook `"uiTheme": "ios"` for an iOS target, and
   npm apps still required Bun).

Nothing has run on Windows, macOS, Android, iOS, Docker or GitHub Actions.

## 5. Open tasks, in the order to do them

The tasks below are complete as of this hand-off. Group A needs the user's
machine; group B is code work; group C needs the user's accounts or
decisions. Do group A first, because its results may change group B.

### A. Verification on the user's Windows machine (Git Bash)

1. **Machine check.** From the repository root:
   ```bash
   bash start.sh doctor --base tauri --e2e
   bash start.sh doctor --base electron
   ```
   Report each line. If something is missing or too old, show
   `bash start.sh bootstrap --base <base> --e2e --dry-run` and wait for the
   user's approval before running it without `--dry-run`. Expected Windows
   needs for Tauri: Rust 1.90+ with the MSVC toolchain, Visual Studio C++
   Build Tools ("Desktop development with C++"), WebView2; for Electron:
   Node.js 22.17+.
2. **Builder check.** `bun install` then `bun run verify` in the repository.
   On failure, fix and re-run.
3. **Generate and test each example plan** into folders outside the
   repository (for example `/c/dsab-tests/<name>`):
   ```bash
   bash start.sh create /c/dsab-tests/tauri-full --plan plans/examples/tauri-full.json --install --verify
   cd /c/dsab-tests/tauri-full && bun run test:e2e
   ```
   Do this for all 11 plans. The npm example uses `npm run test:e2e`. Tauri
   end-to-end tests on Windows need `tauri-driver` (`cargo install
   tauri-driver --locked`) and an `msedgedriver.exe` matching the installed
   Edge version on the PATH (`docs/tauri/08-testing-debugging.md` in a
   generated app explains how to obtain it). If they cannot run, record why.
4. **Installers.** In an Electron app run `bun run make`; in a Tauri app run
   `bun run build:app`. Install each result and confirm it launches.
5. **Windows-specific risks to watch** (see section 6): path handling with
   spaces, CRLF line endings, the Next.js `web-export` folder on Electron,
   Rust MSVC linking, and the `doctor.mjs` shell use for `.cmd` shims.

### B. Code work not yet done

6. **Mobile build (Android).** With the user's approval to install Android
   Studio, the SDK and the NDK: generate `plans/examples/tauri-mobile.json`,
   run `bun run android:init`, `bun run android:build` and `bun run
   android:dev` on an emulator. This is the first time the Rust code compiles
   for a mobile target; fix `#[cfg(desktop)]` gating in
   `tauri/template/src-tauri/src/*.rs` if it fails. `docs/tauri/14-mobile.md`
   (in the app) lists environment variables and steps.
7. **Mobile versions of modules.** Only `database` has `"mobile": true` in
   `config/catalog.json`. `secure-storage` (keyring crate), `auth-oidc`
   (deep links on mobile need app links) and `filesystem` (dialog plugin is
   partial on mobile) need mobile support or stay desktop-only.
8. **Tauri end-to-end tests on macOS** need the WebdriverIO Tauri service
   (macOS has no WebDriver for its web view); not set up.
9. **Tauri crash reporting** has no module; the community `sentry-tauri`
   plugin is only documented.
10. **Konsta UI gaps**: module panels still use shadcn components inside
    Konsta screens; Konsta's brand color (`--color-brand-primary`, which must
    be a hex color) is not set from the plan's theme (an OKLCH color).
11. **Other interface kits** in `docs/UI_KITS.md` are documented only; adding
    one means a new `uiKits` entry in `config/catalog.json` plus an overlay
    under `ui/` (see `CONTRIBUTING.md`).
12. **Next.js** is offered only with the native profile.
13. **Tauri remote-profile end-to-end test** only proves the window opened
    when the hosted site is unreachable; add a local test server if a
    stronger check is wanted.
14. **Bootstrap gaps**: it does not fetch `msedgedriver`; on Linux, Android
    Studio is a manual step; on Windows, `NDK_HOME` is set only on a second
    run with `--mobile` after the NDK is installed.
15. **Builder CI** (`.github/workflows/ci.yml`) still uses
    `actions/checkout@v4` and `actions/setup-node@v4`; generated apps use v7.
16. **UNVERIFIED assumptions to confirm**: whether `tauri-apps/tauri-action@v1`
    recognizes Bun's text `bun.lock`; the Android platform, build-tools and
    NDK versions pinned in `docker/Dockerfile`; the Android download URL in the
    Dockerfile (derived, not fetched).
17. **Docker**: build the image with and without `WITH_ANDROID=true` and run
    `bash start.sh doctor --base tauri` inside it.
18. **GitHub Actions**: after the user creates the repository and approves a
    push, run the builder CI and a generated app's `ci.yml`; `release.yml`
    runs on a `v*` tag and creates a draft release (needs approval).
19. **macOS and iOS** (needs a Mac): repeat group A, then `ios:init`,
    `ios:build`, `ios:dev` on the mobile example.

### C. Waiting on the user

20. **First Git commit** of the builder, whether to push, and the GitHub
    repository name.
21. **Signing credentials**: Windows certificate (OV/EV or Azure Artifact
    Signing), Apple Developer account (macOS and iOS), Android keystore, Tauri
    updater key pair. The release workflows contain the signing steps
    commented out until these secrets exist (`docs/tauri/11-signing.md`,
    `docs/electron/03-signing.md`).
22. **Store accounts**: Microsoft Store, Apple App Store, Google Play, and
    optionally CrabNebula Cloud.
23. **Sibling builders**: Mobile Starter App Builder and Extension Starter
    App Builder are only names; the existing Expo repository has not been
    given the same bootstrap, machine detection and self-contained setup.

## 6. Analysis: where problems are most likely

The points below are judgments from the code and the Linux test runs, not
observed failures. They are listed so the next session looks there first.

1. **Windows is the largest unknown.** All end-to-end runs were on Linux.
   Likely trouble spots: Electron Forge's Squirrel maker on Windows; Tauri's
   MSVC linker if the C++ workload is incomplete; `xvfb-run` does not exist
   on Windows (run end-to-end tests directly); Playwright's Electron launch
   with the fuses the template sets; and paths with spaces. `.gitattributes`
   forces LF line endings for everything except `.ps1`, which avoids most
   line-ending problems in Git Bash.
2. **Tauri end-to-end tests on Windows** depend on `msedgedriver.exe`
   matching the installed Edge version; a version mismatch fails at session
   start, not in the tests.
3. **The mobile code path has never compiled.** The desktop build proves only
   the desktop side of the `#[cfg(desktop)]` split. The most likely mobile
   failures are an unused-import warning becoming an error under strict
   settings, plugin crates that are desktop-only, and Android package-name
   rules (the plan already rejects hyphens in `appId` when Android is a
   target).
4. **Next.js frontends** rely on two mechanisms that passed on Linux but
   could differ elsewhere: Tauri's automatic hashing of Next.js's inline
   scripts into the content security policy, and Electron's `app://` scheme
   serving `web-export/`. If a packaged Next.js app shows a blank window,
   check the developer console for blocked scripts or 404s first.
5. **The bootstrap's Windows branch** has run only against stand-ins. Real
   winget may return non-zero for "already installed" (the script reports and
   continues), the Visual Studio Build Tools installer needs the user to
   accept an administrator prompt, and newly installed tools may need a new
   Git Bash window before they are on the PATH (the script adds the usual
   folders for the current session).
6. **Generated-app lint is strict.** Every generated app fails `verify` on
   any Biome formatting difference. Template sources are formatted with the
   apps' Biome settings; any template edit must be re-formatted the same way
   (`CONTRIBUTING.md` explains), or every generated app will fail lint.

## 7. Definition of done for the next session

The next session is done when: every group A step has run on Windows with its
result reported; every failure found there is fixed in the builder with
`bun run verify` passing and the affected plan regenerated and passing; the
results are added to `docs/GAP_ANALYSIS.md` (moving items from open to closed,
or adding new ones); and nothing was committed, pushed, signed, published or
installed without the user's explicit approval.

## 8. Status after the first Windows session

This section records what the first session on the user's Windows machine
(Git Bash) did, so the next session continues from here and not from section 5.

1. **Done.** Group A step 1 (machine check) and step 2 (builder check). The
   machine check on Windows 11 found Bun 1.4.4, Git, Visual Studio C++ Build
   Tools and WebView2 present; Rust, Cargo and `tauri-driver` missing; and
   Node.js 22.14.0 (managed by nvm-windows), which is older than the 22.17
   that Electron apps need. `bun run verify` passes (type check, lint, 70
   tests, generation dry run of all 11 example plans).
2. **Fixed in the builder.** Three defects in the Windows branch of
   `scripts/bootstrap.sh` (an older system Node.js shadowing the user's own;
   winget not found because its WindowsApps folder was not searched; a
   conflicting winget Node.js install proposed on a machine that uses
   nvm-windows). They are recorded in `docs/GAP_ANALYSIS.md`.
3. **Blocked on the user's approval.** Group A steps 3 and 4 need system
   software that the user has not yet approved installing: Node.js 22.17+ via
   `nvm install 22.17.0` and `nvm use 22.17.0` (Electron); Rust via
   `winget install Rustlang.Rustup` then `rustup default stable-msvc`, and
   `cargo install tauri-driver --locked`, and a matching `msedgedriver.exe`
   (Tauri). Show `bash start.sh bootstrap --base <base> --e2e --dry-run` and ask.
4. **Sibling builders exist as separate repositories.** The Mobile Starter App
   Builder (Expo and a Tauri 2 mobile generator, with its own history) and the
   Browser Extension Starter App Builder (empty) sit beside this repository on
   the user's disk. Task 23 in section 5 is therefore superseded: do not copy
   mobile or extension generators into this repository without asking the user,
   because the mobile builder is under active work and its Tauri 2 generator
   overlaps this repository's Tauri base with mobile targets. Deciding how the
   two Tauri mobile paths relate is an open question for the user.
5. **Commit and push.** The user authorized committing and pushing the
   repository to `main` of its `origin` remote. The remote was empty when
   checked, so the first push needs no force. The commit message states that all
   end-to-end testing so far ran on Linux and that the Windows runs of groups A3
   and A4 had not happened.
