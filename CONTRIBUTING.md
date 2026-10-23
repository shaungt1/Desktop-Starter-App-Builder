# Contributing

Contributions that add modules, profiles or fixes are welcome. This guide
explains the development loop and the steps for the two most common changes.
The conventions every change follows are in [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md),
and the generator's internals in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Development loop

1. `bun install` in the builder root.
2. Make the change.
3. `bun run verify` — type check, lint, unit tests (including the catalog
   consistency test and a generation dry run of every example plan).
4. For template or module changes, `bun run test:generate` creates real apps and
   runs their own quality gates. Limit it with
   `DSAB_PLANS=electron-full,tauri-full`, keep the apps with `DSAB_KEEP=1`, and
   add `DSAB_E2E=1` where a display (or `xvfb-run`) is available.
5. If the catalog changed, `bun run docs:modules` regenerates `docs/MODULES.md`
   (the unit tests fail if it is stale).

Template and module source is formatted with the generated apps' Biome
configuration. The simplest way to check a change is to generate an app that
uses it and run `bun run verify` inside that app.

## Adding a module

1. Choose a kebab-case id and create `electron/modules/<id>/`, `tauri/modules/<id>/`
   and/or `extension/modules/<id>/` with the layout in `docs/CONVENTIONS.md`.
2. Electron: export `mainModule` from `src/main/modules/<id>/index.ts` using
   `defineMainModule({ id, router, setup?, beforeReady?, dispose? })`, and
   optionally `feature` from `src/renderer/features/<id>/index.tsx`.
3. Tauri: write `src-tauri/src/modules/<snake_id>.rs` with
   `pub fn register<R: Runtime>(builder) -> builder`, optional
   `pub fn setup<R: Runtime>(app)`, and `#[tauri::command]` functions generic
   over `R: Runtime`. Add a capability file for any plugin permission it needs.
4. Add the module to `config/catalog.json`: title, summary, category, and per
   base the overlay folder, packages, crates, commands, `rustSetup`,
   `tauriConf` patch, `requires`, `conflicts`, `options` and `manualSteps`.
5. Add unit tests for its logic and, if it has a user flow, an end-to-end test.
6. Add it to `plans/examples/electron-full.json` and/or `tauri-full.json`, run
   `bun run docs:modules`, `bun run verify` and
   `DSAB_PLANS=electron-full,tauri-full bun run test:generate`.

## Adding a profile

1. Create `<base>/profiles/<id>/` containing the files that replace template
   files (on Electron, at least `src/main/content.ts` exporting
   `registerContentSchemes`, `trustedOrigins` and `loadContent`).
2. Add the profile to the base in `config/catalog.json` with its title,
   summary, overlay and any `requiresPlanFields`.
3. Add an example plan in `plans/examples/` and, if the profile changes what
   the window shows, an end-to-end test in the overlay's `tests/e2e/`.

## Adding a frontend or interface kit

Frontends (`frontends/`) and interface kits (`ui/`) are overlays described in
`config/catalog.json` under `frontends` and `uiKits`. Each implementation per
base lists, in order of application:

1. `remove`: template files the option replaces (for example the Vite entry point);
2. `overlays`: folders copied over the app, either into the app root (`"into": "root"`) or into the base's interface folder (`"into": "renderer"`: `src/renderer` on Electron, `src` on Tauri);
3. `packageJson`: scripts to set, dependencies to add and `removeDependencies`;
4. `jsonPatches` (deep-merged into JSON files such as `tsconfig.json`), `tauriConf`, `textInserts` (a line inserted after an anchor, for example a CSS import) and `gitignore` lines.

Screens and layouts must import navigation only from `@/lib/navigation`
(`NavLink`, `useAppNavigation`) so they work with every frontend, and the app's
name and description only from `@/lib/app-identity`. Add an example plan in
`plans/examples/` that uses the new option, run `bun run verify`, then generate
it with `DSAB_PLANS=<name> DSAB_E2E=1 bun run test:generate` and confirm the
app's own `verify` and end-to-end tests pass. Format template sources with the
generated apps' Biome configuration before committing, because apps fail their
lint step on any formatting difference.

## Updating upstream-derived code

`bash start.sh upstream check` reports whether the pinned upstream projects
have moved. `bash start.sh upstream fetch` checks them out under `.cache/` at
the pinned commit; compare with the owned templates, adopt fixes by hand, and
update the commit in `config/sources.json`.
