# Agent instructions

This repository is **Desktop Starter App Builder**, a generator for Electron
and Tauri desktop applications. Agents must read [`AGENT_START.md`](AGENT_START.md)
before running any command; it defines the decisions to collect, the gated
sequence and the rules.

When the task is to change the builder itself (not to generate an app):

1. Run `bun install` once in the builder root.
2. Make the change. Module code lives in `electron/modules/<id>/` and `tauri/modules/<id>/`; every module is declared in `config/catalog.json`.
3. Run `bun run verify` (type check, lint, unit tests, which include a catalog-consistency test and a generation dry run of every example plan).
4. For changes to templates or modules, also run `bun run test:generate` (installs and verifies real generated apps; slow) and, where a display is available, `DSAB_E2E=1 bun run test:generate`.
5. Regenerate `docs/MODULES.md` with `bun run docs:modules` when the catalog changes.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for how to add a module or a profile.
