---
name: desktop-release
description: Prepare and build a release of a generated app. Use when the user asks for installers or a new version.
---

# Release

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Read `docs/RELEASE_AND_SIGNING.md`.
2. Increase the version in every file the checklist names.
3. Run `bun run verify` and `bun run test:e2e`.
4. Report which signing variables are present and missing; never ask for secrets in chat.
5. Run `bash start.sh release <app>` without `--publish` and list the produced files.
6. Stop and ask before publishing. Use `--publish` only with explicit approval for this release; Tauri apps publish from CI.

## Done when
Installers are built and listed, and publishing has either been approved and done or left to the user.
