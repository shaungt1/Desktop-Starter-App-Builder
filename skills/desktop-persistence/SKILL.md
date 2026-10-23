---
name: desktop-persistence
description: Change what a generated app stores: preferences, database schema or secrets. Use for schema changes, new tables or new stored settings.
---

# Persistence

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Decide the tier: preferences (Electron electron-store, Tauri store plugin), structured data (database module), credentials (secure-storage module). Never put secrets in preferences or the database.
2. Schema change: append a migration with the next version (Electron `src/main/modules/database/migrations.ts`, Tauri `migrations()` in `src-tauri/src/modules/database.rs`). Never edit a shipped migration.
3. Update the repository functions and their tests.
4. Run `bun run verify` and, for user-visible changes, `bun run test:e2e`.

## Done when
Migrations are append-only, tests cover the new queries and both checks pass.
