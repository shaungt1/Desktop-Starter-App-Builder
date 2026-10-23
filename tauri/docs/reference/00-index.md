# Tauri 2 Agent Documentation Set: Index

Source pages:
- https://github.com/tauri-apps/tauri-docs (git clone, commit `b62e441c3522fb9ffb01a92898071bac9463d6f7`, committed 2026-10-21T17:40:10-03:00), directory `src/content/docs/`
- https://github.com/tauri-apps/create-tauri-app (git clone, commit `379add21351259c03d3a61fa44aea62485b50cc9`, committed 2026-10-21T15:42:35+08:00)
- https://github.com/tauri-apps/plugins-workspace (git clone, commit `11211c30e71796cd737280303244552bb7f70797`, committed 2026-10-17T22:13:18-03:00)
- https://github.com/tauri-apps/tauri (sparse git clone, commit `8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f`): config schema, `tauri add` source, CLI changelog
- https://v2.tauri.app/reference/config/ (fetched)
- https://v2.tauri.app/reference/cli/ (fetched)
- https://v2.tauri.app/start/prerequisites/ (fetched, used to confirm the live site matches the git source)
- https://registry.npmjs.org (via `npm view`) and https://crates.io/api/v1/crates/ (via curl), for version numbers

Verified on 2026-10-21

## What this set is

This folder is a condensed, agent-oriented rewrite of the official Tauri v2 documentation. Tauri is a framework for building desktop (and mobile) applications in which the user interface is a web frontend (HTML, CSS, JavaScript or TypeScript) rendered by the operating system's own web view, and the backend is a Rust program. The frontend and backend talk to each other over an inter-process communication (IPC) channel that is guarded by a permission system.

Every file was written from the documentation source in the `tauri-docs` repository and from the code of the official tools, not from memory. Where a statement could not be checked against a source, it is marked **UNVERIFIED**. Several workflows were also executed in a Linux sandbox (Ubuntu 24.04) to confirm that the commands work; those are marked **(tested)**.

## Version numbers on 2026-10-21

The table below lists the current published versions, checked with `npm view <pkg> version` and the crates.io API.

| Package | Registry | Version |
| --- | --- | --- |
| `tauri` (Rust crate) | crates.io | 2.12.5 |
| `tauri-build` (Rust crate) | crates.io | 2.7.4 |
| `tauri-cli` (Rust crate) | crates.io | 2.12.4 |
| `@tauri-apps/cli` | npm | 2.12.4 |
| `@tauri-apps/api` | npm | 2.12.4 |
| `create-tauri-app` | npm | 4.7.5 |
| `create-tauri-app` | crates.io | 4.8.0 |
| `@tauri-apps/plugin-sql` / `tauri-plugin-sql` | npm / workspace | 2.6.0 |
| `@tauri-apps/plugin-store` / `tauri-plugin-store` | npm / workspace | 2.5.0 |
| `@tauri-apps/plugin-updater` / `tauri-plugin-updater` | npm / workspace | 2.14.0 |

Note that `create-tauri-app` is published under the same name on two registries, and the two are at different versions (npm 4.7.5, crates.io 4.8.0). Running `bun create tauri-app --version` on this date reported **4.8.0**, so the bun entry point resolved the newer build. The plugin versions for every official plugin are listed in `06-plugins.md`. The plugin workspace sets a minimum Rust version of **1.90** for all plugins.

## Files and when to read them

The list below says what each file covers and the situation in which an agent should open it.

1. **`01-prerequisites.md`**: the system packages, Rust toolchain and JavaScript runtime that must be installed on Windows, macOS and Linux. Read this first on a fresh machine, or whenever a build fails with a missing library or linker.
2. **`02-create-project.md`**: how to scaffold a new app with `create-tauri-app` (including the non-interactive flags and the React + TypeScript + Vite template under Bun), the project layout, the dev/build commands, and how to add Tauri to an existing frontend with `tauri init`. Read this when starting a project or orienting in an unfamiliar one.
3. **`03-config.md`**: the important fields of `tauri.conf.json` (identity, build hooks, windows, security, bundling), platform-specific config files and the `--config` merge mechanism. Read this before editing the config.
4. **`04-security-capabilities.md`**: capabilities, permissions, scopes, the default capability file, how plugins contribute permissions, Content Security Policy (CSP) and the isolation pattern. Read this whenever the frontend gets a "not allowed" error, or before exposing anything sensitive.
5. **`05-ipc.md`**: commands (`#[tauri::command]` and `invoke`), events, channels, managed state, async commands and serializable errors. Read this when adding any frontend-to-Rust or Rust-to-frontend communication.
6. **`06-plugins.md`**: every official plugin with its add command, purpose, platform support and default permission set. Read this before adding a plugin.
7. **`07-distribute.md`**: bundle formats per OS, code signing on Windows and macOS (including notarization variables), updater signing keys and endpoints, and GitHub Actions with `tauri-action`. Read this before producing release artifacts.
8. **`08-testing-debugging.md`**: WebDriver end-to-end tests, IPC mocking in frontend unit tests, opening devtools, the log plugin and Rust tests. Read this when writing tests or diagnosing runtime behaviour.
9. **`09-agent-recipes.md`**: short, exact, ordered recipes (create an app with Bun, add a command and capability, add SQLite, add the store, add the updater, build a release) and a table of common errors with fixes. Read this when a task matches one of the recipes; it links back to the detailed files.
10. **`10-plugin-catalog.md`**: every official plugin explained for deciding whether an app needs it: what it does, when to use it and when not, platforms, install commands, the narrowest permissions, mobile manifest entries, and which builder module already uses it. Read this before adding any plugin.
11. **`11-signing.md`**: code signing for Windows, macOS (with notarization), Linux, Android and iOS, plus the updater key: why each platform needs it, what to buy or register, where it is configured and which CI secret holds it.
12. **`12-pipelines-ci.md`**: the GitHub Actions workflows generated apps ship with (`ci.yml`, `release.yml`), every `tauri-action` input, mobile builds in CI and the CrabNebula Cloud pipeline.
13. **`13-distribution-stores.md`**: every installer format and store (Windows installers, macOS bundle and DMG, Debian, RPM, AppImage, Flathub, Snapcraft, AUR, Microsoft Store, Apple App Store, Google Play, CrabNebula Cloud), opening with a decision table.
14. **`14-mobile.md`**: Android and iOS: prerequisites per host, environment variables, project changes, `android`/`ios` commands, emulators and simulators, debugging and testing.
15. **`15-mobile-plugin-development.md`**: writing a plugin with Kotlin and Swift code when no official plugin covers a device feature.
16. **`16-architecture-and-project-files.md`**: how Tauri is built (TAO, WRY, web views), every project file, icons, resources, sidecars, state and dependency updates.
17. **`17-nextjs-frontend.md`**: Next.js as the frontend (static export, `tauri.conf.json` build keys, unsupported features, client-only code). Apps generated with `"frontend": "nextjs"` already have this configuration; their packaged end-to-end tests pass under the template's content security policy on Linux, which settles that open question for Linux.

## Conventions used in this set

The command examples use Bun because that is the requested package manager. In the official docs, the Bun form of a Tauri CLI call is written `bun tauri <command>`, while the project that `create-tauri-app` generates prints `bun run tauri <command>`. Both invoke the `tauri` script from `package.json`; the `bun run tauri ...` form was the one tested here. The working directory for frontend commands is the project root, and the working directory for `cargo` commands is `src-tauri/` unless stated otherwise.
