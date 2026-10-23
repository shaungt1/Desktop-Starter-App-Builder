---
name: desktop-intake
description: Collect the decisions needed to generate a desktop app with Desktop Starter App Builder and turn them into a project plan. Use when the user asks for a new desktop app, or before running `create`.
---

# Intake

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Inputs
The user's description of the app, and any decisions already stated.

## Steps
1. Read `AGENT_START.md` (section "Decisions to collect") and `docs/CHOOSING_A_BASE.md`.
2. Extract every decision the user already made; do not ask for those again.
3. Ask, in one message, only for what is missing: the app's scope and expected size (proof of concept or growing product, integrations, mobile), identity (name, app id), base, profile (and the hosted URL for `remote`), frontend (`vite` or `nextjs`), interface kit (`shadcn` or `konsta` with `ios`/`material`), package manager (`bun` or `npm`), targets (Tauri: `android`, `ios`), modules, required module options (`bash start.sh module show <id>`), brand colors, target folder (full or relative path).
4. If the base is undecided, apply the decision rule (Electron for large, growing products; Tauri for lean apps, proofs of concept and mobile) and state which rule decided it, labelled as a non-binding proposal.
5. Write the plan file (copy the closest `plans/examples/*.json` or use `bash start.sh plan new --out <file> ...`).
6. Run `bash start.sh plan check <file>` and show the resolved plan, including modules added because another module requires them.

## Done when
A plan file exists, `plan check` passes, and the user has approved the resolved plan.
