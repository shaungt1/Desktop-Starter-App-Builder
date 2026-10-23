# Tauri agent reference (generated-app structure)

This reference gives an AI agent exact recipes for common changes in an app
generated on the Tauri base. It complements `reference/`, which summarizes the
official Tauri documentation; this file explains how this builder's apps are
organized so changes land in the right place. The app's own `AGENTS.md` lists
the rules.

## How the app starts

`src-tauri/src/lib.rs` builds the app in a fixed order: the single-instance
plugin first (a second launch, including one caused by a deep link, is
forwarded to the running copy), then deep-link, log, store, opener and
window-state, then `modules::register` for every enabled module. In `setup` it
registers the URL scheme, creates the main window (`window.rs`; label `main`)
and calls `modules::setup`. All commands go through the single handler returned
by `modules::handler()`.

## Recipe: add a command

1. Write the function in `src-tauri/src/commands.rs` or in a module file:

   ```rust
   #[tauri::command]
   pub async fn rename_note<R: tauri::Runtime>(app: tauri::AppHandle<R>, id: i64, title: String) -> AppResult<()> {
       if title.trim().is_empty() || title.len() > 200 {
           return Err(AppError::Invalid("Title must be 1 to 200 characters.".into()));
       }
       // ...
       Ok(())
   }
   ```

2. Add its path to `generate_handler![...]` in `src-tauri/src/modules/mod.rs`
   (for a builder module, also add the name to the module's `commands` list in
   the builder catalog so regeneration keeps it).
3. Add a typed wrapper in `src/lib/ipc.ts` or the module's `api.ts`:
   `renameNote: (id: number, title: string) => invoke<void>("rename_note", { id, title })`.
   Argument names are camelCase in TypeScript and snake_case in Rust.
4. Prove it: a `#[cfg(test)]` test for the logic, a Vitest test using `mockIPC`
   for the interface, then `bun run verify`.

App commands are allowed for the app's own windows by default; plugin commands
are not.

## Recipe: use an official plugin

1. `bun run tauri add <name>` adds the crate, the npm package and a
   registration line. In this structure, move the registration into the module
   that uses it (`builder.plugin(...)` inside `register`) so `lib.rs` stays core-only.
2. Grant the narrowest permission in a capability file in
   `src-tauri/capabilities/` (one file per module). A missing permission fails at
   run time with "<plugin>.<command> not allowed"; a misspelled one fails the build.
3. Prefer calling the plugin from Rust when the interface only needs a result.

## Recipe: background work

Spawn a task in a module's `setup` with `tauri::async_runtime::spawn`. Send
progress to the interface with `app.emit("<area>://<event>", payload)` (listened
to with `listen` from `@tauri-apps/api/event`) or, for ordered high-volume
streams, a `tauri::ipc::Channel` passed into a command. Keep shared state in a
type registered with `.manage()` and guard mutable data with a lock that is not
held across `.await`. The background module shows the pattern, including hiding
the window on close and a tray menu.

## Recipe: change the database schema

Append a `Migration` to `migrations()` in `src-tauri/src/modules/database.rs`
with the next version, then update `src/features/database/notes-repository.ts`.
The sql plugin applies pending migrations when the interface first loads
`sqlite:app.db`.

## Facts that prevent common mistakes

1. Commands must be generic over `R: Runtime` because the handler is generic.
2. Keep `src-tauri/Cargo.lock`; it pins `rust-ini` 0.21.1, which the deep-link
   plugin needs until it adapts to newer `rust-ini` releases.
3. The updater plugin needs a `plugins.updater` section in `tauri.conf.json`
   even when updates are configured at run time.
4. `build.devUrl` (port 1420) and `vite.config.ts` must agree.
5. `app.config.json` is compiled into the binary (`include_str!`), so changing
   it requires a rebuild.
