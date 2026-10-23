# Prompt: change the builder

```text
Read AGENTS.md, CONTRIBUTING.md, docs/ARCHITECTURE.md and docs/CONVENTIONS.md
in this repository.

Change: [e.g. "add a notifications module for Electron and Tauri" or
"update the Electron template to the latest electron-shadcn fixes"].

Follow CONTRIBUTING.md: put module code in electron/modules/<id> and
tauri/modules/<id>, declare it in config/catalog.json, add tests, add it to the
full example plans, run `bun run docs:modules`, `bun run verify`, and
`DSAB_PLANS=electron-full,tauri-full bun run test:generate`. Report every
command you ran with its result and anything you could not run.
```
