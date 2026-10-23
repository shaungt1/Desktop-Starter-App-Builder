---
name: desktop-troubleshoot
description: Diagnose a failing builder command, app build, test or start-up. Use whenever a command exits non-zero or an app does not start.
---

# Troubleshoot

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Re-run the exact failing command and capture the full error.
2. Look it up in `docs/TROUBLESHOOTING.md` and, for Tauri, `tauri/docs/reference/09-agent-recipes.md`.
3. Find the cause before changing anything; state it in two or three sentences.
4. Make the smallest fix. Never weaken security settings, skip tests or delete tests to make a failure disappear.
5. Re-run the failing command, then `bun run verify`.

## Done when
The original command and `verify` pass, and the cause and fix are reported.
