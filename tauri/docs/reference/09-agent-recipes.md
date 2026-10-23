# Agent Recipes

Source pages:
- All pages listed in files `01` to `08` of this set (this file condenses them).
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/plugin/sql.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/plugin/store.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/plugin/updater.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/learn/Security/using-plugin-permissions.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/state-management.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/start/prerequisites.mdx

Verified on 2026-10-21

## How to use this file

Each recipe below is a short, ordered procedure. Steps marked **(tested)** were executed in a Linux sandbox on 2026-10-21 with Bun 1.4.3, `@tauri-apps/cli` 2.12.4 and `create-tauri-app` 4.8.0, ending in a successful `cargo check`. Running the app window (`tauri dev`) and producing installers (`tauri build`) were **not** executed in the sandbox. All commands are run from the project root unless the step says `src-tauri`.

## Recipe 1: Create a new React + TypeScript app with Bun

Prerequisites: OS dependencies and Rust per `01-prerequisites.md`, plus Bun.

1. Scaffold without prompts **(tested)**:
   ```sh
   bun create tauri-app my-app --template react-ts --manager bun --identifier com.example.myapp --yes
   ```
   Use `--yes`, not `-y`: the short form was rejected under `bun create` in testing.
2. Install dependencies **(tested)**:
   ```sh
   cd my-app
   bun install
   ```
3. Start the app in development mode (opens a window, hot-reloads the frontend, rebuilds Rust on change):
   ```sh
   bun run tauri dev
   ```
   The first run compiles all Rust dependencies and takes noticeably longer than later runs.
4. Check that `identifier` in `src-tauri/tauri.conf.json` is your real reverse-domain ID; `tauri build` rejects `com.tauri.dev`.

## Recipe 2: Add a Rust command, call it from the frontend, and allow it

Commands registered in `invoke_handler` are callable by every window by default, so a plain app command does not need a capability entry. A capability entry is required for plugin commands.

1. In `src-tauri/src/lib.rs`, add the command (not `pub` when defined in `lib.rs`):
   ```rust
   #[tauri::command]
   fn add(a: i32, b: i32) -> i32 {
       a + b
   }
   ```
2. Register it in the **single** `generate_handler!` list, next to any existing ones:
   ```rust
   .invoke_handler(tauri::generate_handler![greet, add])
   ```
3. Call it from TypeScript (argument keys are camelCase forms of the Rust names):
   ```ts
   import { invoke } from '@tauri-apps/api/core';
   const sum = await invoke<number>('add', { a: 2, b: 3 });
   ```
4. If it can fail, return `Result<T, E>` where `E: serde::Serialize` (simplest: `Result<T, String>` with `.map_err(|e| e.to_string())`); the promise rejects with the error.
5. If it needs shared data, register state with `.manage(Mutex::new(MyState::default()))` and take `state: tauri::State<'_, Mutex<MyState>>`. An `async` command that takes `State` must return a `Result`.
6. To also let the frontend use a built-in or plugin API, add its permission to `src-tauri/capabilities/default.json`, either by editing `"permissions"` or with **(tested)**:
   ```sh
   bun run tauri permission add <identifier> default
   ```
   where the last argument is the capability identifier (`default` in a generated project).
7. To restrict which windows may call your own app commands, the docs point to `tauri_build::AppManifest::new().commands(&[...])` in `build.rs`; the resulting permission names were not verified (see `04-security-capabilities.md`).

Steps 1, 2 and 5 were compiled successfully as part of the test project **(tested)**.

## Recipe 3: Add SQLite with the SQL plugin

1. Add the plugin **(tested)**:
   ```sh
   bun run tauri add sql
   ```
   This adds `tauri-plugin-sql`, `@tauri-apps/plugin-sql`, `sql:default` in `capabilities/default.json`, and `.plugin(tauri_plugin_sql::Builder::new().build())` in `lib.rs`.
2. Enable the SQLite driver, which `tauri add` does not do **(tested)**:
   ```sh
   cd src-tauri
   cargo add tauri-plugin-sql --features sqlite
   cd ..
   ```
3. Allow writes. `sql:default` only allows `load`, `select` and `close`, so add execute **(tested)**:
   ```sh
   bun run tauri permission add sql:allow-execute default
   ```
4. Optional migrations, registered on the builder in `lib.rs` (replacing the line `tauri add` inserted):
   ```rust
   use tauri_plugin_sql::{Migration, MigrationKind};

   let migrations = vec![Migration {
       version: 1,
       description: "create_initial_tables",
       sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);",
       kind: MigrationKind::Up,
   }];

   tauri::Builder::default()
       .plugin(
           tauri_plugin_sql::Builder::default()
               .add_migrations("sqlite:mydatabase.db", migrations)
               .build(),
       )
   ```
   To run them at startup, add `"plugins": { "sql": { "preload": ["sqlite:mydatabase.db"] } }` to `tauri.conf.json`; otherwise they run when the frontend loads that connection string. The docs show the builder written both as `Builder::default()` and (via `tauri add`) `Builder::new()`.
5. Use it from TypeScript. The SQLite path is relative to the app config directory, and placeholders are `$1, $2, ...`:
   ```ts
   import Database from '@tauri-apps/plugin-sql';
   const db = await Database.load('sqlite:mydatabase.db');
   await db.execute('INSERT INTO users (id, name) VALUES ($1, $2)', [1, 'Ada']);
   const rows = await db.select('SELECT * FROM users');
   ```
   The docs page shows only `load` and `execute`; the `select` call was checked against the plugin's TypeScript source (`plugins/sql/guest-js/index.ts`), where it is `select<T>(query: string, bindValues?: unknown[]): Promise<T>` and `execute(query, bindValues?)` returns a `QueryResult`.

## Recipe 4: Add the key-value store

1. Add the plugin **(tested)**:
   ```sh
   bun run tauri add store
   ```
   This adds the crate and npm package, `store:default` (which already allows every store operation), and `.plugin(tauri_plugin_store::Builder::new().build())`.
2. Use it:
   ```ts
   import { load } from '@tauri-apps/plugin-store';
   const store = await load('settings.json', { autoSave: false });
   await store.set('theme', { value: 'dark' });
   const theme = await store.get<{ value: string }>('theme');
   await store.save(); // required when autoSave is false
   ```
   With `autoSave` omitted or a number, changes are saved after a debounce (100 ms by default). `new LazyStore('settings.json')` defers loading until first use.

## Recipe 5: Add the updater

1. Add the plugins **(tested for updater)**:
   ```sh
   bun run tauri add updater
   bun run tauri add process   # only if you want relaunch() after installing
   ```
   `tauri add updater` puts the crate under a desktop-only target, creates `capabilities/desktop.json` with `updater:default`, registers `.plugin(tauri_plugin_updater::Builder::new().build())`, and sets `plugins.updater.requireSignedVersion: true` in `tauri.conf.json`.
2. Generate keys and keep the private key secret and backed up **(tested)**:
   ```sh
   bun run tauri signer generate --ci -w ~/.tauri/myapp.key -p ""
   ```
   Omit `--ci -p ""` to be prompted for a password.
3. Edit `src-tauri/tauri.conf.json`:
   ```json
   {
     "bundle": { "createUpdaterArtifacts": true },
     "plugins": {
       "updater": {
         "requireSignedVersion": true,
         "pubkey": "<paste the CONTENT of ~/.tauri/myapp.key.pub>",
         "endpoints": ["https://github.com/<owner>/<repo>/releases/latest/download/latest.json"]
       }
     }
   }
   ```
4. Check and install from the frontend:
   ```ts
   import { check } from '@tauri-apps/plugin-updater';
   import { relaunch } from '@tauri-apps/plugin-process';
   const update = await check();
   if (update) {
     await update.downloadAndInstall();
     await relaunch();
   }
   ```
5. Build with the key in the environment (not a `.env` file), as in Recipe 6, and publish the bundles, their `.sig` contents and a `latest.json` (or let `tauri-action` generate it). Details are in `07-distribute.md`.

## Recipe 6: Build a release

1. Set `version` in `tauri.conf.json` and confirm `identifier` is not `com.tauri.dev`.
2. Optionally regenerate icons from a square PNG or SVG: `bun run tauri icon ./app-icon.png`.
3. If the updater is used, export the signing key:
   ```sh
   export TAURI_SIGNING_PRIVATE_KEY="$HOME/.tauri/myapp.key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   ```
4. If signing, set the platform variables from `07-distribute.md` (macOS: `APPLE_SIGNING_IDENTITY` and notarization credentials; Windows: `bundle.windows.certificateThumbprint`, `digestAlgorithm`, `timestampUrl`).
5. Build:
   ```sh
   bun run tauri build                    # all formats for this OS
   bun run tauri build --bundles deb      # or a specific format
   ```
6. Collect artifacts from `src-tauri/target/release/bundle/<format>/`. `.msi` can only be built on Windows; Linux packages should be built on the oldest distribution you support (Ubuntu 22.04 or Debian 12 are suggested); for all three OSes use CI with `tauri-apps/tauri-action@v1`.

## Common errors and fixes

The table below maps symptoms to their documented causes. Each fix cites where it comes from.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Linux build fails in `pkg-config` looking for `webkit2gtk-4.1` / `javascriptcoregtk-4.1`, or other `*-sys` crates fail to find system libraries (exact message **UNVERIFIED**) | Missing Linux system packages | Install the `apt` list from `01-prerequisites.md` (`libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`). Tauri v2 needs WebKitGTK **4.1**; the older 4.0 package is not enough. |
| App fails at runtime on an older Linux with `version 'GLIBC_2.33' not found` | Built on a newer distribution than the target | Build on the oldest supported base (Ubuntu 22.04 / Debian 12), for example in Docker or CI (Debian guide). |
| Windows: app or installer cannot render / WebView2 missing | WebView2 runtime absent (only possible before Windows 10 1803 or on stripped systems) | Install the WebView2 Evergreen Bootstrapper for development; for users, choose `bundle.windows.webviewInstallMode` (`downloadBootstrapper` default, `embedBootstrapper`, `offlineInstaller`, `fixedVersion`). |
| Windows: linker or toolchain errors when compiling | C++ Build Tools missing, or Rust's default toolchain is GNU | Install C++ Build Tools with "Desktop development with C++"; run `rustup default stable-msvc`. |
| Windows MSI build: `failed to run light.exe` | VBSCRIPT optional feature disabled | Enable VBSCRIPT in Optional features, or build only `nsis`. |
| Frontend `invoke` rejects with `<plugin>.<command> not allowed. Permissions associated with this command: ...` | The calling window's capability lacks a permission for that plugin command | Add one of the listed permissions to the capability that targets this window label, for example `bun run tauri permission add sql:allow-execute default`. Check that the capability's `windows` contains the right label (labels, not titles) and its `platforms` include the current OS. |
| Message `... not allowed on window "X", webview "X", URL: ...` | Permission exists but not for this window or URL | Add the window label to the capability's `windows` (or create a capability for it). |
| `fs` call fails with `forbidden path` although the permission is listed | Permission granted without a scope | Use the object form with `allow: [{ "path": "$APPDATA/**" }]` (or another path variable). |
| Build fails with `Permission <id> not found, expected one of ...` **(tested)** | Typo in a capability, or the plugin is not installed | Fix the identifier using the list in the error, or the generated `src-tauri/gen/schemas/desktop-schema.json`; install the plugin if missing. |
| `invoke` rejects with a "state not managed" error | `State<'_, T>` type differs from what was passed to `manage` (for example `AppState` vs `Mutex<AppState>`) | Use the exact managed type; a type alias helps. |
| `error[E0255]: the name '__cmd__<name>' is defined multiple times` | A command in `lib.rs` is marked `pub` | Remove `pub`, or move the command to a module (where it must be `pub`). |
| Compile error about borrowed arguments in an `async` command | `&str` or `State<'_, T>` in an async command returning a plain value | Use owned types (`String`) or return `Result<T, E>`. |
| Only some commands work | `invoke_handler` called more than once (only the last call counts) | Put all commands in one `generate_handler![...]`. |
| Command argument arrives empty or deserialization fails | Frontend used snake_case keys | Use camelCase keys, or `#[tauri::command(rename_all = "snake_case")]`. |
| Event listener never fires or cannot be removed | `unlisten` called on the unresolved Promise, or the event was sent to a specific webview | `await listen(...)` first; for targeted events use the webview's own `listen` or `{ target: { kind: 'Any' } }`. |
| `tauri dev` window blank or "connection refused" | `devUrl` port does not match the frontend server, or the port is taken | Make `devUrl` and the Vite `server.port` equal; the template uses 1420 with `strictPort: true`. |
| SQL plugin compile or runtime error about missing database driver (exact message **UNVERIFIED**) | No `sqlite`/`mysql`/`postgres` feature enabled | `cargo add tauri-plugin-sql --features sqlite` in `src-tauri`. |
| Updater build does not produce `.sig` files or fails to sign | `createUpdaterArtifacts` not set, or the private key is in a `.env` file | Set `bundle.createUpdaterArtifacts: true`; export `TAURI_SIGNING_PRIVATE_KEY` (and password) in the real environment. |
| Updater rejects the update | `pubkey` is a path instead of key content; `signature` in the JSON is a path/URL instead of the `.sig` content; a platform entry in static JSON is incomplete; or, with `requireSignedVersion`, the signed version does not match the announced version | Correct the corresponding value; re-sign older releases if enabling `requireSignedVersion`. |
| macOS users see "app is damaged" for an unsigned download | No code signature (Apple Silicon requires one) | Sign and notarize, or at least ad-hoc sign with `"signingIdentity": "-"`. |
| `tauri build` rejects the identifier | Identifier still `com.tauri.dev` | Set a unique reverse-domain `identifier`. |
| `bun create tauri-app ... -y` prints `Error: Invalid Argument '-y'` **(tested)** | Short flag not passed through under `bun create` | Use `--yes`. |
