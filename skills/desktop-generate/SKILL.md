---
name: desktop-generate
description: Generate, install and verify an app from an approved plan. Use after desktop-intake has produced an approved plan.
---

# Generate

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Inputs
An approved plan file and a target folder outside the builder.

## Steps
1. Confirm the target is missing, empty, or contains only `.git`, `README.md`, `LICENSE`, `.gitignore`, `.gitattributes`. Never delete files to make room.
2. Run `bash start.sh create <target> --plan <plan>`.
3. Run `bash start.sh setup <target>`.
4. Run `bash start.sh verify <target>`. If it fails, switch to desktop-troubleshoot before anything else.
5. If the machine can show a window (or has `xvfb-run`), run `bun run test:e2e` (or `npm run test:e2e`) in the app (Tauri needs `tauri-driver`). Otherwise record that it was not run and why.
6. Tell the user the new folder is a separate project with its own Git repository, `AGENTS.md` and `docs/`, and should be opened on its own from now on.

## Done when
`verify` passes and the end-to-end result (pass, or the reason it was not run) is recorded for the hand-off.
