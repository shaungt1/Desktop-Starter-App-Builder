# Prompt: extend an existing browser extension

**Purpose.** Have an agent add a feature to an extension this builder generated,
following the project's rules and proving the change with its tests.

**How to use.** Start the agent in the generated extension's folder, fill in the
brackets and paste.

```text
Read AGENTS.md and README.md in this project, and the extension agent reference at
docs/extension/AGENT_REFERENCE.md in this project.

Task: [describe the feature, e.g. "show the page title in the popup, fetched from
the content script through a new typed message"].

Constraints: add every message through the typed protocol in src/lib/messaging.ts,
validated with Zod. Keep no state in the background worker's variables; use the typed
storage items in src/lib/settings.ts. Add a permission or a match pattern only if the
feature cannot work without it, tell me which and why, and prefer activeTab or an
optional permission to broad host access. No remotely hosted code, no secrets in the
extension. If the feature needs a builder module that is not installed (see
.desktop-starter.json), stop and tell me the exact
`bash start.sh module add <id> <this folder>` command instead of copying files.

Done means: unit tests for the new logic, `bun run verify` passing, and
`bun run test:e2e` passing if the popup, options page, background worker, a content
script or the manifest changed. Report the files you changed, the permissions added,
and the commands you ran with their results.
```
