# Tauri base

This folder holds everything the builder uses to generate Tauri 2 apps: the
template, the remote profile, the modules, an agent reference written from the
official Tauri documentation, and prompts. The builder copies from here;
nothing in this folder is meant to be run directly.

## Purpose and best use

Tauri builds a desktop app from a web interface and a compiled Rust core,
using the web view the operating system already provides instead of bundling a
browser. The result installs in a few megabytes (the full test app's `.deb` is
about 4.5 MB) and uses little memory. Every capability the interface uses must
be granted in a capability file, which makes the app's native surface easy to
review. Choose it for utilities and companion apps, thin clients over a remote
API, tools where download size or start-up time matters, and teams willing to
write native logic in Rust; Tauri can also target iOS and Android from the same
code. Its weaker fits are apps whose native logic is already npm packages, and
interfaces that depend on Chromium-only behavior, because each operating system
renders with a different engine. The full comparison is in
[`../docs/CHOOSING_A_BASE.md`](../docs/CHOOSING_A_BASE.md).

## Stack

The template is adapted from create-tauri-app's React + TypeScript template
and uses the following:

| Concern | Choice |
| --- | --- |
| Framework | Tauri 2.12, Rust edition 2024 (Rust 1.90+) |
| Core plugins | single-instance (with deep-link forwarding), deep-link, log, store, opener, window-state |
| Interface | React 19 with Vite 8 and TanStack Router (default) or Next.js 16 static export; TanStack Query; Tailwind CSS 4; shadcn-style components or Konsta UI; Motion and @use-gesture |
| IPC | `#[tauri::command]` functions with typed TypeScript wrappers; one `AppError` type |
| Storage | store plugin (preferences), sql plugin with SQLite (database module), OS key store via `keyring` (secure-storage module) |
| Tests | Vitest with `@tauri-apps/api/mocks`, `cargo test`, WebdriverIO through `tauri-driver` |
| Lint and format | Biome 2 for TypeScript, rustfmt conventions for Rust |
| Package manager | Bun (default) or npm, chosen in the plan |

## Folder map

The table below describes each subfolder.

| Folder | Contents |
| --- | --- |
| `template/` | The core app. `src-tauri/Cargo.lock` pins crate versions known to build together. |
| `profiles/remote/` | Guide for granting a hosted site access to commands (the window itself is chosen in `window.rs`). |
| `modules/<id>/` | Optional modules: database, secure-storage, auth-oidc, auto-update, filesystem, background. |
| `docs/reference/` | Eighteen files written from the official Tauri v2 docs at pinned commits: prerequisites, project creation, configuration, security and capabilities, IPC, plugins, distribution, testing, recipes, the plugin catalog (when and why), signing, CI pipelines, distribution and stores, mobile, mobile plugin development, architecture and project files, and Next.js. Copied into every generated app as `docs/tauri/`. |
| `prompts/` | Ready-made prompts for setting up and extending Tauri apps with an agent. |

## Setting up a Tauri app

Manually: install the prerequisites in [`../docs/MANUAL_SETUP.md`](../docs/MANUAL_SETUP.md),
then follow [`../QUICKSTART.md`](../QUICKSTART.md) with `"base": "tauri"` in
the plan. With an agent: paste [`prompts/setup-tauri-app.md`](prompts/setup-tauri-app.md)
into your agent from the builder folder. For changes inside a generated app,
point the agent at `docs/reference/09-agent-recipes.md` and the app's `AGENTS.md`.
