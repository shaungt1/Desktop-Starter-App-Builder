---
name: desktop-builder-maintenance
description: Add a module or profile to the builder itself, or fix a template. Use when the change is to Desktop Starter App Builder rather than to a generated app.
---

# Builder Maintenance

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Read `AGENTS.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md`.
2. Put module code in `electron/modules/<id>` and/or `tauri/modules/<id>` following the module contract; declare it in `config/catalog.json`.
3. Add unit tests and, for user flows, an end-to-end test; add the module to the full example plans.
4. Run `bun run docs:modules`, `bun run verify` and `DSAB_PLANS=electron-full,tauri-full bun run test:generate` (with `DSAB_E2E=1` where possible).

## Done when
All three pass and `docs/MODULES.md` is regenerated.
