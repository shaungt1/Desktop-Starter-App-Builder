# Architecture

This document explains how Desktop Starter App Builder turns a project plan
into an application, and the contracts that templates and modules follow. It
is written for people extending the builder and for agents that need to
understand why the generated files look the way they do.

## Design goals

The builder was designed around four requirements. First, it must be
**reusable**: generating an app never copies or modifies the builder, so one
checkout serves every project. Second, the result must be **independent**: a
generated app has its own Git history and its own copies of all code, with no
runtime dependency on the builder. Third, a **script run and an agent run must
produce identical apps**, so every choice lives in data (the plan and the
catalog) rather than in prose instructions. Fourth, **modules can be added
later** without regenerating or overwriting the user's work.

## The pieces

The table below names each piece of the system and its role.

| Piece | Location | Role |
| --- | --- | --- |
| Project plan | any JSON file, copied into the app as `project-plan.json` | The decisions for one app: identity, base, profile, modules, options, theme. |
| Catalog | `config/catalog.json` | Every base, profile and module as data: template folder, overlays, packages, crates, commands, requirements, conflicts, options, manual steps. |
| Base template | `electron/template`, `tauri/template` | The core app for a base, with `__TOKEN__` placeholders for plan values. |
| Shared interface | `shared/renderer` | Components, styles and design tokens copied into both bases. |
| Profile overlay | `electron/profiles/<id>`, `tauri/profiles/<id>` | Files that replace template files for a non-default profile. |
| Module overlay | `electron/modules/<id>`, `tauri/modules/<id>` | Files a module adds. Never overwrites existing files. |
| Builder program | `cli/` | Validates plans, composes apps, writes registries, runs app scripts. |
| Provenance | `.desktop-starter.json` in each app | Builder version and commit, creation time, base, profile, enabled modules and the full plan. |

## How `create` works

`create` performs the following steps in order, and refuses to start if any
precondition fails.

1. **Validate the plan** against the catalog (`cli/lib/plan.ts`). Values that
   end up in JSON, TOML and source files may not contain quotes, backslashes,
   backticks, `$` or line breaks. Required modules are added before the modules
   that need them, conflicts are rejected and required module options are checked.
2. **Check the target.** It must be outside the builder and may only contain
   `.git`, `README.md`, `LICENSE`, `.gitignore`, `.gitattributes` or `.DS_Store`.
   Existing files of that kind are kept.
3. **Copy the base template**, then the **shared interface** into the base's
   interface folder (`src/renderer` for Electron, `src` for Tauri).
4. **Apply the profile overlay**, replacing template files of the same name.
5. **Copy each module overlay** without overwriting anything.
6. **Merge packages** into `package.json` (and, for Tauri, crates into
   `src-tauri/Cargo.toml` after the `# @dsab:module-dependencies` line, and
   configuration patches into `tauri.conf.json`). Versions already present are
   kept.
7. **Write the registry files** that import the enabled modules (see below).
8. **Write `app.config.json`**, the non-secret runtime configuration both
   processes read.
9. **Replace tokens** such as `__APP_NAME__`, `__APP_ID__`, `__APP_SCHEME__`
   and the theme values in every file the builder wrote (never in files the
   user already had).
10. **Record provenance** and copy the plan into the app.
11. **Initialize Git** on branch `main` unless a repository already exists. No
    remote is added and nothing is committed.

`module add` repeats steps 5 to 10 for an existing app, using the provenance
file to know which modules are already installed.

## Registries: how modules plug in without editing core files

Core files never mention modules by name. Instead, the builder writes small
**registry** files listing the enabled modules, and the core imports the
registry. This keeps module code self-contained and makes adding a module a
purely additive change.

**Electron** uses three registries:

- `src/main/modules/registry.ts` lists each module's `mainModule` object. The
  main process calls each module's optional `beforeReady` hook before Electron
  is ready, `setup` after it is ready (in dependency order), and `dispose` on quit.
- `src/main/ipc/router.ts` merges the core procedures with each module's
  `router` under the module's camel-cased id, so the interface calls
  `ipc.database.createNote(...)` and the type of every call is checked.
- `src/renderer/features/registry.ts` lists each module's interface panel, shown
  on the home screen.

**Tauri** uses two:

- `src-tauri/src/modules/mod.rs` declares each module's Rust file, calls each
  module's `register(builder)` to add plugins and state, calls each module's
  `setup(app)` after the main window exists, and builds the single
  `generate_handler!` list from the catalog's `commands` entries.
- `src/features/registry.ts`, the same panel list as on Electron.

## Module contract

A module is a folder whose layout mirrors the generated app. The catalog
describes it with these fields:

| Field | Meaning |
| --- | --- |
| `overlay` | Folder copied into the app. |
| `dependencies`, `devDependencies` | npm packages merged into `package.json`. |
| `mainModule` (Electron) | The folder has `src/main/modules/<id>/index.ts` exporting `mainModule` built with `defineMainModule`. |
| `rendererFeature` | The folder has `features/<id>/index.tsx` exporting `feature` (id, title, description, Panel). |
| `cargo` (Tauri) | Crates added to `Cargo.toml`; features are merged into an existing crate line. |
| `rustModule`, `rustSetup`, `commands` (Tauri) | The Rust file name, whether it exposes `setup`, and its command function names. |
| `tauriConf` (Tauri) | Object deep-merged into `tauri.conf.json`. |
| `requires`, `conflicts`, `options`, `env`, `manualSteps` | Dependencies between modules, plan options, environment variables and steps a person must do. |

A test (`tests/unit/catalog.test.ts`) checks that every catalog entry matches
the files on disk: the declared entry points exist, the module id inside the
code matches, and every listed Tauri command is a `#[tauri::command]` function
in the module's Rust file.

## Runtime architecture of a generated Electron app

The main process (`src/main/main.ts`) acquires the single-instance lock,
registers the deep-link scheme, applies session and window hardening, starts
modules, starts the IPC server and opens the window. The preload script
exposes nothing to the page; it only forwards a `MessagePort` that the page
creates. The main process checks the sending page's origin, then attaches the
oRPC handler to that port. Every procedure validates its input with Zod.
Long-running work runs in `utilityProcess` workers bundled from
`src/main/workers/`. Packaged builds set Electron's fuses so the binary cannot
be run as plain Node and only loads its own integrity-checked archive.

## Runtime architecture of a generated Tauri app

`src-tauri/src/lib.rs` registers the single-instance plugin first (so a second
launch, including one caused by a deep link, is forwarded to the running copy),
then deep-link, log, store, opener and window-state plugins, then each module.
In `setup` it registers the URL scheme for development, creates the main window
for the chosen profile and runs module start-up. Commands return `AppResult`,
which the interface receives as a rejected promise with a readable message.
Capabilities in `src-tauri/capabilities/` grant only what each module uses.

## What was deliberately left out

The following were considered and left out to keep the builder small, with the
reason for each.

1. **A monorepo with shared packages across web, desktop and mobile.** It is the
   better end state for a product family but requires restructuring existing
   web apps; generated apps are standalone so they work without that decision.
2. **Next.js as the renderer of the native profile.** Static export removes the
   features that make Next.js worth using; the remote and exported profiles
   cover reuse of an existing Next.js app.
3. **Prisma as the default database layer.** It adds a code-generation step and,
   with the SQLite adapter, a native module that must be rebuilt for Electron.
   The built-in `node:sqlite` needs neither; Prisma remains a documented recipe.
4. **Generated peer-to-peer and OS sync-provider integrations.** The right
   transport differs per product; the recipe module records the options.
5. **Committed snapshots of upstream templates.** The owned templates are the
   source of truth; `config/sources.json` pins the upstream commits so fixes can
   be reviewed with `bash start.sh upstream fetch`.
