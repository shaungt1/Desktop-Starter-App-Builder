# Prompt: extend an existing Electron app

**Purpose.** Have an agent add a feature to an app this builder generated,
following the app's rules and proving the change with its tests.

**How to use.** Start the agent in the generated app's folder, fill in the
brackets and paste.

```text
Read AGENTS.md and README.md in this project, and the Electron agent reference
at [path to the builder]/electron/docs/AGENT_REFERENCE.md.

Task: [describe the feature, e.g. "add a screen listing notes with search,
backed by a new IPC procedure that queries the database"].

Constraints: keep Node and Electron code in src/main and call it from the
interface only through typed IPC procedures with Zod-validated input. Do not
weaken the security settings. If the feature needs a builder module that is
not installed (see .desktop-starter.json), stop and tell me the exact
`bash start.sh module add <id> <this folder>` command instead of copying files.

Done means: unit tests for the new logic, `bun run verify` passing, and
`bun run test:e2e` passing if start-up, windows, IPC or a user flow changed.
Report the files you changed and the commands you ran with their results.
```
