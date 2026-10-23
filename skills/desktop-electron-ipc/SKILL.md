---
name: desktop-electron-ipc
description: Add or change a typed IPC procedure in a generated Electron app. Use when interface code needs something from the main process (files, database, OS features, network with credentials).
---

# Electron Ipc

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Read the app's `AGENTS.md` and the builder's `electron/docs/AGENT_REFERENCE.md` (recipe "add an IPC procedure").
2. Define the procedure with `procedure.input(<zod schema>).handler(...)` in the owning module's `index.ts` or in `src/main/ipc/core-router.ts`.
3. Add it to that module's `router` (or `coreRouter`).
4. Call it from the interface through `ipc.<namespace>.<name>()`; let TypeScript check the call.
5. Write a unit test for the logic; run `bun run verify`.

## Rules
Validate every input. Never expose Node or Electron APIs to the renderer or through the preload script. Never return secrets to the renderer.

## Done when
The procedure is tested and `bun run verify` passes.
