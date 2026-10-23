# Changelog

All notable changes to Desktop Starter App Builder are recorded here.

## Unreleased

- Bootstrap on Windows: startup no longer puts `C:\Program Files\nodejs` ahead of the user's own PATH (an older system Node.js hid the one the shell runs); the WindowsApps folder is searched so winget is found; machines that use nvm-windows get `nvm install` and `nvm use` as a manual step instead of a conflicting winget install.
- README: worked example of starting an app from a request and a target folder, and a section on the sibling mobile and browser-extension builders. QUICKSTART: a base chooser (step 0).
- Hand-off document: section 8 records the first Windows session and the open decisions.

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
