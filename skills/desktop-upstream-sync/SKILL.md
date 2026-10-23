---
name: desktop-upstream-sync
description: Review and adopt fixes from the upstream projects the templates were derived from. Use when maintaining the builder.
---

# Upstream Sync

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Run `bash start.sh upstream check`.
2. For a source that moved, run `bash start.sh upstream fetch` and compare the relevant files in `.cache/upstreams/<id>` with the owned template.
3. Adopt fixes deliberately, one at a time, keeping this builder's security settings and structure.
4. Update the commit in `config/sources.json`, run `bun run verify` and `DSAB_PLANS=electron-full,tauri-full bun run test:generate`.

## Done when
The pin is updated and both checks pass.
