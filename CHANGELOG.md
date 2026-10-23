# Changelog

All notable changes to Desktop Starter App Builder are recorded here.

## 1.2.0 — 2026-10-23

Browser extensions, a requirements checklist, and the first Windows run.

- New **browser extension base** (`--base extension`): a Manifest V3 extension for Chrome, Edge and Firefox built with WXT, React, Tailwind CSS and TypeScript. It has a popup, an options page, a background service worker and a content script, with typed Zod-validated messaging, typed storage, Vitest unit tests, Playwright end-to-end tests that load the built extension into Chromium, CI and a release workflow that builds store ZIP files (store submission runs only when started by hand). Modules: `side-panel`, `context-menu`, `content-ui`. Plans: `extension-basic`, `extension-full`. Reference set in `extension/docs/`, prompts in `extension/prompts/`, skill `desktop-extension`.
- New `docs/REQUIREMENTS.md`: the exact tools per base with install commands, the install script, and the accounts needed to ship; a unit test keeps it in agreement with the scripts. New prompt `prompts/setup-machine.md` has an agent prepare a machine.
- `doctor` accepts `--base extension` and, on Windows with `--e2e`, checks that `msedgedriver` has the same major version as the installed Microsoft Edge.
- Bootstrap (`bash start.sh bootstrap`, `scripts/bootstrap.ps1`): accepts `--base extension`; downloads the `msedgedriver` that matches Edge from Microsoft; no longer lets an older system Node.js hide the one the shell runs; searches the WindowsApps folder for winget; prints `nvm` commands instead of installing a second Node.js under nvm-windows; no longer exits silently when a tool is present but broken (for example a rustup proxy with no toolchain).
- Plans validate per base: an extension accepts only the `vite` frontend and the `shadcn` kit and builds for the `browser` target.
- Docker: the image now builds (it had never been built) and works. The entrypoint starts Xvfb directly, because `xvfb-run` hung as the container's first process. Verified inside the image: `doctor`, and generate, verify and end-to-end tests of the extension, Electron and Tauri examples; with `WITH_ANDROID=true` the `tauri-mobile` example builds an unsigned APK and AAB.
- Verified on Windows 11: all 11 desktop example plans and both extension plans generate, verify and pass end-to-end tests; Windows installers build (unsigned, not installed). See `docs/TESTING.md`.
- CI: builder workflow updated to `actions/checkout@v7` and `actions/setup-node@v7` and now generates the extension.
- Troubleshooting entries for Windows machines and browser extensions.

## 1.1.0 — 2026-10-22

Self-contained apps, more interface options and shipping documentation.

- Generated apps are self-contained: bundled `docs/` (setup resources, the base's full reference, interface kits), `scripts/bootstrap.sh`, `scripts/bootstrap.ps1` and `scripts/doctor.mjs`, `.vscode/` tasks and extensions, and `.github/workflows/ci.yml` and `release.yml`.
- `new TARGET [plan flags]` creates an app at a full or relative path in one step; README and AGENT_START describe clean-slate and contributing modes.
- Plan fields `frontend` (`vite`, `nextjs`), `ui` and `uiTheme` (`shadcn`, `konsta` with `ios` or `material`), `packageManager` (`bun`, `npm`) and `targets` (Tauri `android`, `ios`).
- Motion and @use-gesture in every app; animated screen transitions that respect reduced-motion settings.
- `doctor` checks minimum versions, Linux installer tools, mobile tooling (`--mobile`) and end-to-end drivers (`--e2e`).
- `bash start.sh bootstrap` (scripts/bootstrap.sh) detects the machine and installs missing prerequisites after confirmation: Windows in Git Bash (winget), macOS (Homebrew, official installers) and Linux (apt, dnf, pacman). scripts/bootstrap.ps1 does the same for PowerShell users.
- New documentation: `docs/REPOSITORY_STRUCTURE.md`, `docs/SETUP_RESOURCES.md`, `docs/UI_KITS.md`; Tauri reference pages 10 to 17 (plugin catalog, signing, pipelines, stores, mobile, mobile plugins, architecture, Next.js); Electron reference set (architecture, makers, signing, publishing and updates, app stores, Next.js, testing).
- Electron Windows signing reads its certificate from the environment; Tauri apps default to ad-hoc macOS signing and set a publisher.
- Docker image documents its purpose and can include the Android SDK and NDK.
- Template screens moved from `pages/` to `screens/`; the layout and settings screen are shared by both bases.

## 1.0.0 — 2026-10-21

First release.

- Builder command-line tool on Bun with `doctor`, `list`, `plan`, `create`, `setup`, `verify`, `run`, `module`, `release` and `upstream`, plus Bash and PowerShell entry scripts.
- Data-driven catalog of bases, profiles and modules, with a consistency test.
- Electron base (Electron 45, Forge 8, Vite 8, React 19, oRPC + Zod): native, remote and exported profiles.
- Tauri base (Tauri 2.12, React 19, Vite 8): native and remote profiles; agent reference written from the official docs.
- Modules: database, secure-storage, auth-oidc, auto-update, filesystem, background (both bases); crash-reporting (Electron); Prisma and peer-to-peer recipes.
- Agent instructions, 13 skills, prompts for both bases, Docker image, VS Code tasks and a CI workflow for Linux, Windows and macOS.
