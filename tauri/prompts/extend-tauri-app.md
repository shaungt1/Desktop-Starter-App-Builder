# Prompt: extend an existing Tauri app

**Purpose.** Have an agent add a feature to an app this builder generated,
following the app's rules and proving the change with its tests.

**How to use.** Start the agent in the generated app's folder, fill in the
brackets and paste.

```text
Read AGENTS.md and README.md in this project, plus
[path to the builder]/tauri/docs/AGENT_REFERENCE.md and, for any plugin you
use, the matching file in [path to the builder]/tauri/docs/reference/.

Task: [describe the feature, e.g. "export notes to a Markdown file chosen in a
save dialog"].

Constraints: put native work in Rust commands generic over R: Runtime that
return AppResult; add each command to generate_handler! and a typed wrapper in
the interface. Grant only the narrowest plugin permissions in a capability file.
If the feature needs a builder module that is not installed (see
.desktop-starter.json), stop and tell me the exact
`bash start.sh module add <id> <this folder>` command instead of copying files.

Done means: Rust unit tests and interface tests for the new logic,
`bun run verify` passing, and `bun run test:e2e` passing where tauri-driver is
available. Report the files you changed and the commands you ran with their results.
```
