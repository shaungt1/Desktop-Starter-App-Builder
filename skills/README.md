# Skills

A skill is one instruction file for one job, in the `SKILL.md` format with a
`name` and `description` header that agent tools use to decide when to load
it. These skills cover the full life of an app built with this builder, from
collecting decisions to the final report. Each defers to `AGENT_START.md`.
To use them with an agent that supports skills, copy or link this folder into
the agent's skills directory (for Claude Code, `.claude/skills/` in the project
or in your home folder).

The table below lists every skill and when it applies.

| Skill | When to use |
| --- | --- |
| [`desktop-intake`](desktop-intake/SKILL.md) | Collect the decisions needed to generate a desktop app with Desktop Starter App Builder and turn them into a project plan. Use when the user asks for a new desktop app, or before running `create`. |
| [`desktop-host-check`](desktop-host-check/SKILL.md) | Check that the machine has the tools a base needs before generating or building. Use before the first `create` on a machine, or when a build fails for a missing tool. |
| [`desktop-generate`](desktop-generate/SKILL.md) | Generate, install and verify an app from an approved plan. Use after desktop-intake has produced an approved plan. |
| [`desktop-module-add`](desktop-module-add/SKILL.md) | Add an optional module to an app the builder generated earlier. Use when the user wants sign-in, a database, updates, file access, background work or another catalog module in an existing app. |
| [`desktop-electron-ipc`](desktop-electron-ipc/SKILL.md) | Add or change a typed IPC procedure in a generated Electron app. Use when interface code needs something from the main process (files, database, OS features, network with credentials). |
| [`desktop-tauri-command`](desktop-tauri-command/SKILL.md) | Add or change a Rust command or plugin use in a generated Tauri app. Use when interface code needs native work in a Tauri app. |
| [`desktop-extension`](desktop-extension/SKILL.md) | Change a generated browser extension safely: add a message, setting, permission, content script or entrypoint. Use when the project is a browser extension (base `extension`). |
| [`desktop-persistence`](desktop-persistence/SKILL.md) | Change what a generated app stores: preferences, database schema or secrets. Use for schema changes, new tables or new stored settings. |
| [`desktop-auth`](desktop-auth/SKILL.md) | Configure and troubleshoot sign-in (auth-oidc module) with an OpenID Connect provider. Use when setting up the identity provider or when sign-in fails. |
| [`desktop-release`](desktop-release/SKILL.md) | Prepare and build a release of a generated app. Use when the user asks for installers or a new version. |
| [`desktop-upstream-sync`](desktop-upstream-sync/SKILL.md) | Review and adopt fixes from the upstream projects the templates were derived from. Use when maintaining the builder. |
| [`desktop-troubleshoot`](desktop-troubleshoot/SKILL.md) | Diagnose a failing builder command, app build, test or start-up. Use whenever a command exits non-zero or an app does not start. |
| [`desktop-handoff`](desktop-handoff/SKILL.md) | Write the final report after generating or changing an app. Use at the end of every builder task. |
| [`desktop-builder-maintenance`](desktop-builder-maintenance/SKILL.md) | Add a module or profile to the builder itself, or fix a template. Use when the change is to Desktop Starter App Builder rather than to a generated app. |

A typical new-app run uses them in this order: desktop-host-check,
desktop-intake, desktop-generate, then desktop-handoff, with
desktop-troubleshoot whenever a step fails.
