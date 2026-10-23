---
name: desktop-tauri-command
description: Add or change a Rust command or plugin use in a generated Tauri app. Use when interface code needs native work in a Tauri app.
---

# Tauri Command

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Read the app's `AGENTS.md` and the builder's `tauri/docs/AGENT_REFERENCE.md`; for plugins also the matching file in `tauri/docs/reference/`.
2. Write a `#[tauri::command]` function generic over `R: Runtime` returning `AppResult<T>`.
3. Add it to `generate_handler!` in `src-tauri/src/modules/mod.rs` and add a typed wrapper using `invoke`.
4. For plugin calls from the interface, grant the narrowest permission in a capability file.
5. Add a Rust `#[cfg(test)]` test and a Vitest test with `mockIPC`; run `bun run verify`.

## Done when
`bun run verify` passes, including `cargo test`.
