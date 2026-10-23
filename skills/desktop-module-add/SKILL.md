---
name: desktop-module-add
description: Add an optional module to an app the builder generated earlier. Use when the user wants sign-in, a database, updates, file access, background work or another catalog module in an existing app.
---

# Module Add

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Run `bash start.sh module show <id>`; report its required options and manual steps.
2. Collect option values from the user (never secrets: options are shipped with the app).
3. Run `bash start.sh module add <id> <app> --option key=value ...`. It copies the module and anything it requires, updates the registry files, installs and runs `verify`.
4. If verification fails, use desktop-troubleshoot.
5. List the module's manual steps for the user.

## Rules
Never copy module files by hand and never edit the generated registry files to add a catalog module.

## Done when
`module add` finishes with `verification passed` and the manual steps are reported.
