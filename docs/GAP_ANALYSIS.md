# Gap analysis

Before this release, the desktop generator existed only as two bill-of-materials
documents and a proposed folder layout; the repository itself was empty. This
document lists every gap identified at that point, states how each was closed,
and records the items that remain open, so that the next contributor knows
exactly what is and is not done.

## Gaps that were closed

The table below pairs each gap with what now exists in the repository.

| Gap | Resolution |
| --- | --- |
| No entry script | `start.sh` (Bash) and `start.ps1` (PowerShell) call one Bun program in `cli/` with the commands `doctor`, `list`, `plan`, `create`, `setup`, `verify`, `run`, `module`, `release` and `upstream`. |
| No agent instructions | `AGENT_START.md` (canonical), `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md` (pointers), plus `AGENTS.md` inside every generated app. |
| Skill files existed only as names | Thirteen skills in `skills/`, each with a single job, inputs, steps and a definition of done. |
| No machine-readable catalog of choices | `config/catalog.json` describes bases, profiles and modules as data; a test keeps it consistent with the code. |
| No upstream pinning | `config/sources.json` pins electron-shadcn, create-tauri-app, tauri-docs and key package versions; `upstream check` and `upstream fetch` compare against them. |
| No cleaned templates | `electron/template` (adapted from electron-shadcn: demo routes, i18n and the development tools hook removed; preload stripped to a single port hand-off; sandbox enabled) and `tauri/template` (adapted from create-tauri-app). |
| Standalone and connected variants undefined | Expressed as **profiles** (native, remote, exported) plus the **auth-oidc** module for connected sign-in, matching the renderer-sourcing decision in the bill of materials. |
| No shared interface | `shared/renderer` (components, design tokens) is copied into both bases. |
| No generator | `cli/commands/create.ts` and `cli/lib/compose.ts`, which accept near-empty targets, never overwrite, initialize Git and record provenance. |
| No way to add capabilities later | `module add`, driven by `.desktop-starter.json`. |
| No module manifests | Each module's packages, crates, commands, configuration patches, options and manual steps are in the catalog; `docs/MODULES.md` is generated from it. |
| Plugin list: one file or one per base | One catalog with a per-base implementation for each module. |
| Tauri reference for agents | `tauri/docs/reference/`, ten files written from the official documentation at pinned commits, with unverified points marked. |
| Open question: does `node:sqlite` work in Electron's main process | Yes on Electron 45; the database module uses it, so no native module or rebuild is needed. |
| Open question: updater default | Electron supports both a public GitHub source and any static file host (private); Tauri uses signed manifests from any URL. |
| Docker | `docker/Dockerfile`, `docker/entrypoint.sh` and `compose.yaml`. |
| VS Code launch | `.vscode/tasks.json` tasks for each builder command and `.vscode/extensions.json` recommendations. |
| Tests | Builder unit tests and a full generation test; every generated app has unit, Rust (Tauri) and end-to-end tests. |
| CI | `.github/workflows/ci.yml`: builder checks, then generation on Linux, Windows and macOS. |
| Name | The repository is named Desktop Starter App Builder; nothing in it refers to "playbook". |

## Gaps closed in the second pass

A review of the first release found that a generated app depended on the
builder for its documentation and machine setup, and that several options the
apps need were missing. The table below lists those gaps and their resolution.

| Gap | Resolution |
| --- | --- |
| Generated apps were not self-contained | Every app now carries `docs/` (setup resources, the base's full reference, interface kits), `scripts/bootstrap.sh`, `scripts/bootstrap.ps1`, `scripts/doctor.mjs`, `.vscode/` tasks and extensions, and `.github/workflows/ci.yml` and `release.yml`. |
| No clean-slate versus contributing explanation | `README.md` and `AGENT_START.md` describe both modes; `new` creates a detached app at a full or relative path in one command. |
| No file-by-file structure document | `docs/REPOSITORY_STRUCTURE.md`. |
| No automated installation of prerequisites | `scripts/bootstrap.sh` (detects Windows in Git Bash and uses winget; macOS: Homebrew and official installers; Linux: apt, dnf, pacman), also run as `bash start.sh bootstrap`, and `scripts/bootstrap.ps1` (the same for PowerShell), each with a plan table, confirmation and `--dry-run`. |
| No manual setup reference per operating system | `docs/SETUP_RESOURCES.md`, with official download pages and verified package identifiers. |
| `doctor` did not check versions, installer tools, mobile tooling or test drivers | One dependency-free `doctor.mjs` used by the builder and the apps, with minimum versions, `--mobile` and `--e2e`. |
| No Next.js option | `frontend: "nextjs"` for both bases (static export; Electron serves it through `app://`, Tauri from `out/`). |
| No mobile-style interface, animation or gestures | `ui: "konsta"` with `uiTheme` `ios` or `material`; Motion and @use-gesture in every app; `docs/UI_KITS.md` surveys the alternatives. |
| Bun only | `packageManager: "npm"` rewrites scripts, docs and workflows. |
| No Android or iOS path | `targets` adds Android and iOS scripts to Tauri apps; the Rust core keeps desktop-only code behind `#[cfg(desktop)]`; `docs/tauri/14-mobile.md` and `15-mobile-plugin-development.md`. |
| Tauri plugins listed without when and why | `tauri/docs/reference/10-plugin-catalog.md`. |
| Signing, pipelines and stores were summaries | Tauri `11-signing.md`, `12-pipelines-ci.md`, `13-distribution-stores.md`; Electron `electron/docs/reference/` (makers, signing, publishing and updates, app stores, Next.js, testing). Windows signing in `forge.config.ts` now reads its certificate from the environment. |
| Docker purpose unclear, no Android | `docs/DOCKER.md` explains when to use it; the image can include the Android SDK and NDK. |

## Gaps found by the first Windows and Docker runs

The first runs on a Windows 11 machine (Git Bash, then Windows PowerShell 5.1)
and the first build of the Docker image found the defects in the table below.
All are fixed in this release.

| Gap | Resolution |
| --- | --- |
| At startup the bootstrap put `C:\Program Files\nodejs` ahead of the user's own PATH, so an older system Node.js hid the version the user's shell (here nvm-windows) actually runs. The bootstrap reported 22.11.0 while `doctor` reported 22.14.0. | Startup now appends the Windows tool folders, so what the shell already resolves wins; after an install step they are prepended so the new tool wins. |
| The bootstrap did not look in `%LOCALAPPDATA%\Microsoft\WindowsApps`, where App Installer places `winget.exe`, and reported winget as missing on a machine that has it. | That folder is now on the bootstrap's Windows search list. |
| On a machine where nvm-windows manages Node.js, the bootstrap queued `winget install OpenJS.NodeJS.LTS`, which would install a second Node.js beside the managed one. | When `NVM_HOME` is set or `nvm` is on PATH, the bootstrap prints the `nvm install` and `nvm use` commands as a manual step instead. |
| The bootstrap exited with status 1 and no output when a tool existed but failed (a rustup proxy in `~/.cargo/bin` before any toolchain is installed), because `set -e` and `pipefail` ended the script inside the version probe. | Version probes tolerate a failing command; the tool reads as not installed. |
| `msedgedriver.exe` was a manual step, and nothing compared its version with Edge's. A mismatch fails only as an opaque session error in the Tauri end-to-end tests. | `doctor --e2e` compares the two versions; both bootstrap scripts read Edge's version from `msedge.exe` and download the matching driver from `msedgedriver.microsoft.com`. |
| `bootstrap.ps1` had never run on Windows PowerShell 5.1 (it was unavailable earlier). A warning written as `Write-Warning 'a' + $Base + 'b'` passed the `+` signs as extra arguments. | Fixed with a parenthesised expression; dry runs of three bases and the driver download now run under 5.1. |
| The Docker image could never be built earlier. Once built, every `docker run` hung: the entrypoint used `xvfb-run`, which waits for a signal that never reaches it when it is the container's first process. | The entrypoint starts Xvfb itself, waits for its socket, and runs the command in a D-Bus session. |
| The builder's `bun test tests/unit` is a substring filter and would also run test files inside templates that sit under a `tests/unit` folder. | The test scripts use `./tests/unit` and `./tests/generation`. |
| The builder's CI used `actions/checkout@v4` and `actions/setup-node@v4` while generated projects use v7. | Updated to v7 (not yet run on GitHub). |

## Android in Docker

The `tauri-mobile` example (desktop plus Android and iOS targets, `konsta` look,
`database` module) was generated inside the image built with
`WITH_ANDROID=true`. `doctor --base tauri --mobile` passed (JDK, `ANDROID_HOME`,
`NDK_HOME`, the Rust Android targets); `verify` passed; `android:init` generated
the Android project; and `android:build` compiled the Rust core for all four
Android targets (aarch64, armv7, i686, x86_64) and produced an unsigned universal
APK and an AAB. This is the first time the `#[cfg(desktop)]` split compiled for a
mobile target. Gradle printed deprecation warnings that come from the Android
project Tauri generates. **Not run**: starting the app in an emulator or on a
device (`android:dev`), signing the APK, and anything on iOS.

## Gaps closed by the browser extension base

The earlier hand-off listed the extension builder as a separate, empty
repository. The extension base now lives here: `extension/` holds the template,
three modules, a nine-page reference set, agent prompts and a skill, and the
catalog, plan validation, `module add`, `release`, `doctor` and both bootstrap
scripts support it. See `README.md` and `extension/README.md`.

## Open items

The following items remain open. Each needs a decision or an account that only
the app's owner can provide, or a platform this release could not test on.

1. **Code-signing credentials** for Windows and macOS, and Tauri update keys.
   The hooks are in place (`docs/RELEASE_AND_SIGNING.md`); the certificates are
   not. The Windows installers built during testing are unsigned, and were
   neither installed nor launched.
2. **macOS has not been used at all**, and neither has iOS. Generation,
   verification, end-to-end tests and installers have run on Windows and on
   Linux (Ubuntu and, in Docker, Debian). The builder's CI workflow runs the
   generation on macOS runners; its first run is the first real check there.
3. **GitHub Actions has not run any workflow.** This covers the builder's
   `ci.yml` and the `ci.yml` and `release.yml` of generated projects, including
   the extension's store-ZIP release workflow. Their action versions were
   checked against each action's published tags on 2026-10-23.
4. **No store submission has ever been made.** The extension's `wxt submit`
   flow, the Chrome Web Store API v2 credentials and the Firefox and Edge APIs
   are documented (`extension/docs/reference/07-publishing-and-stores.md`) but
   untested; every statement there that could not be confirmed is marked
   UNVERIFIED. Registration fees were not stated on the pages opened.
5. **Android and iOS are only partly tested.** The Android build of the
   `tauri-mobile` example compiles and packages in Docker (see "Android in
   Docker"), but it has not been run on an emulator or device, and iOS needs a
   Mac and has never been tried. Only the `database` module is marked
   mobile-capable. Phone and tablet apps built with Expo belong to the separate
   Mobile Starter App Builder.
6. **The Tauri remote profile's end-to-end test** checks that the window opens
   on the hosted URL. Where the hosted site is unreachable, the web view reports
   no URL and the test only proves the window opened.
7. **Tauri end-to-end tests on macOS** need the WebdriverIO Tauri service's
   embedded driver instead of `tauri-driver`; not set up here.
8. **Prisma** is documented as a recipe (`database-prisma`) rather than
   generated, because it adds code generation and a native module.
9. **Peer-to-peer transport and OS sync-provider folders** are documented
   choices (`peer-to-peer`), not generated code.
10. **Crash reporting on Tauri and in extensions** is not provided; the
    community `sentry-tauri` plugin is the documented starting point for Tauri.
11. **Extension limits worth knowing.** Firefox builds as Manifest V2 under
    WXT's default (decide deliberately before shipping, see
    `extension/docs/reference/06-browsers-and-cross-browser.md`); Safari is
    documented only (it needs a Mac and an Apple account); Tailwind `rem` units
    inside a page overlay follow the host page's root font size, and WXT's
    PostCSS fix is not applied.
12. **Konsta UI** panels of modules still use shadcn components inside Konsta
    screens, and Konsta's brand color is not set from the plan's theme.
13. **Other interface kits** in `docs/UI_KITS.md` are documented only.
