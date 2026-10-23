# Prompts

Each file here is an instruction you paste into an AI coding agent (Claude
Code, Codex, GitHub Copilot agent mode, Cursor and similar) to run a common job
with this builder. Every prompt points the agent at `AGENT_START.md`, so the
agent follows the same gated sequence and rules whichever prompt you use.
Fill in the bracketed parts first; write "ask me" for anything you have not decided.

The table below lists the prompts and when to use each.

| Prompt | Use it to |
| --- | --- |
| [`choose-base.md`](choose-base.md) | Decide between Electron and Tauri, and pick a profile and modules, before generating anything. |
| [`new-app.md`](new-app.md) | Create an app when you have not fixed the base yet (the agent applies the decision rule). |
| [`../electron/prompts/setup-electron-app.md`](../electron/prompts/setup-electron-app.md) | Create an Electron app. |
| [`../tauri/prompts/setup-tauri-app.md`](../tauri/prompts/setup-tauri-app.md) | Create a Tauri app. |
| [`add-module.md`](add-module.md) | Add a module to an app the builder generated. |
| [`../electron/prompts/extend-electron-app.md`](../electron/prompts/extend-electron-app.md), [`../tauri/prompts/extend-tauri-app.md`](../tauri/prompts/extend-tauri-app.md) | Build a feature inside a generated app. |
| [`release-app.md`](release-app.md) | Prepare and build a release. |
| [`troubleshoot-app.md`](troubleshoot-app.md) | Diagnose a failing build, test or start-up. |
| [`maintain-builder.md`](maintain-builder.md) | Change the builder itself (new module, template fix, upstream update). |
