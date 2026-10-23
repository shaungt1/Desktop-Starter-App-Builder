# Electron base

This folder holds everything the builder uses to generate Electron apps: the
template, the profiles, the modules, the agent reference and the prompts. The
builder copies from here; nothing in this folder is meant to be run directly.

## Purpose and best use

Electron packages a desktop app with its own copy of the Chromium browser
engine and of Node.js. The interface is a web page; the native side (the
**main process**) is TypeScript with access to the whole Node.js ecosystem and
the operating system. Choose it when the app does real local work: local
databases and search indexes, file synchronization, background workers or
agent loops, device integrations through npm SDKs, or wrapping an existing web
product with native features (tray, deep links, auto-update). Its cost is
installer size (roughly a 100 MB floor) and memory. The full comparison with
Tauri is in [`../docs/CHOOSING_A_BASE.md`](../docs/CHOOSING_A_BASE.md).

## Stack

The template is adapted from the MIT-licensed electron-shadcn project and uses
the following, all pinned in `template/package.json`:

| Concern | Choice |
| --- | --- |
| Runtime | Electron 45 (Chromium + Node.js 24) |
| Build, package, installers, publish | Electron Forge 8 with its Vite plugin, makers for Squirrel (Windows), DMG and ZIP (macOS), DEB and ZIP (Linux), GitHub publisher |
| Hardening | Electron Fuses plugin, sandboxed renderer with context isolation, navigation and permission rules |
| Interface | React 19 with Vite and TanStack Router (default) or Next.js 16 static export; TanStack Query; Tailwind CSS 4; shadcn-style components or Konsta UI; Motion and @use-gesture |
| IPC | oRPC over a MessagePort, Zod 4 validation |
| Storage | electron-store (preferences), `node:sqlite` (database module), safeStorage (secure-storage module) |
| Logging | electron-log |
| Tests | Vitest (+ Testing Library, jsdom), Playwright driving the packaged app |
| Lint and format | Biome 2 |
| Package manager | Bun (default, with the hoisted `node_modules` layout Electron packaging needs) or npm |

## Folder map

The table below describes each subfolder.

| Folder | Contents |
| --- | --- |
| `template/` | The core app. Placeholders such as `__APP_NAME__` are filled from the plan. |
| `profiles/remote/` | Loads a hosted web app; offline screen; guide for calling native code from the hosted site. |
| `profiles/exported/` | Serves a bundled static export over a private `app://` scheme. |
| `modules/<id>/` | Optional modules: database, secure-storage, auth-oidc, auto-update, filesystem, background, crash-reporting. |
| `docs/` | `AGENT_REFERENCE.md` (rules and recipes for agents) and `reference/` (architecture, makers, signing, publishing and updates, app stores, Next.js, testing). Both are copied into every generated app as `docs/electron/`. |
| `prompts/` | Ready-made prompts for setting up and extending Electron apps with an agent. |

## Setting up an Electron app

Manually: follow [`../QUICKSTART.md`](../QUICKSTART.md) with
`"base": "electron"` in the plan. With an agent: paste
[`prompts/setup-electron-app.md`](prompts/setup-electron-app.md) into your
agent from the builder folder.
