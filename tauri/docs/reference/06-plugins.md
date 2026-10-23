# Official Plugins

Source pages:
- https://github.com/tauri-apps/tauri-docs/tree/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/plugin (every `*.mdx` page; install commands and setup notes)
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/packages/compatibility-table/build.ts (shows the docs' platform table is generated from each plugin's `Cargo.toml`)
- https://github.com/tauri-apps/plugins-workspace/tree/11211c30e71796cd737280303244552bb7f70797/plugins (each plugin's `Cargo.toml` `[package.metadata.platforms.support]`, `package.json` version, and `permissions/default.toml`)
- https://github.com/tauri-apps/tauri/blob/8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f/crates/tauri-cli/src/add.rs and `crates/tauri-cli/src/helpers/plugins.rs` (what `tauri add` does per plugin)
- Detailed pages read in full: `plugin/sql.mdx`, `plugin/store.mdx`, `plugin/updater.mdx`, `plugin/file-system.mdx`, `plugin/http-client.mdx`, `plugin/shell.mdx`, `plugin/opener.mdx`, `plugin/logging.mdx`, `plugin/single-instance.mdx`, `learn/Security/using-plugin-permissions.mdx`

Verified on 2026-10-21

## How plugins are added

Every official plugin page gives an "Automatic" install using the Tauri CLI. With Bun the docs write it as `bun tauri add <name>`; the equivalent `bun run tauri add <name>` was used in testing. The source of `tauri add` and the test runs show it does the following:

1. Adds the Rust crate `tauri-plugin-<name>` to `src-tauri/Cargo.toml`. For desktop-only plugins (`autostart`, `cli`, `global-shortcut`, `positioner`, `single-instance`, `updater`, `window-state`) it puts the dependency under `[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]`; for mobile-only plugins (`barcode-scanner`, `biometric`, `nfc`, `haptics`) under the mobile target.
2. Unless the plugin is Rust-only (`localhost`, `persisted-scope`, `single-instance`), installs the npm package `@tauri-apps/plugin-<name>` with a `~<major>` range, and adds `<name>:default` to a capability. Desktop-only plugins go into a desktop capability, which is created (as `capabilities/desktop.json`) if none exists.
3. Inserts `.plugin(tauri_plugin_<name>::init())`, or `::Builder::new().build()` for builder-style plugins, directly after `tauri::Builder::default()` in `lib.rs` or `main.rs`, and runs `cargo fmt`. Special cases: `stronghold` gets `Builder::new(|pass| todo!()).build()`, `localhost` gets `Builder::new(todo!()).build()`, `single-instance` gets `init(|app, args, cwd| {})`, `log` gets `Builder::new().level(tauri_plugin_log::log::LevelFilter::Info).build()`. The `todo!()` placeholders must be replaced by hand before the app will run correctly.
4. For `updater` only, it also sets `plugins.updater.requireSignedVersion: true` in `tauri.conf.json` and reminds you to set `pubkey` and `endpoints` (this behaviour comes from the CLI 2.12 changelog and was observed in testing; the updater docs page does not yet mention `requireSignedVersion`).

The "Manual" alternative on each page is: `cargo add tauri-plugin-<name>` inside `src-tauri`, register the plugin in `lib.rs`, `bun add @tauri-apps/plugin-<name>`, then add permissions to a capability by hand.

Note that the `add` name can differ from the docs page name: the clipboard page is `plugin/clipboard`, but the command is `tauri add clipboard-manager`; the file-system page is `plugin/file-system`, but the command is `tauri add fs`.

## Plugin reference table

The table below lists every plugin in `plugins-workspace` at the commit read. "Platforms" comes from each plugin's `Cargo.toml` metadata, which is the same data the docs render as the "Supported Platforms" table (W = Windows, L = Linux, M = macOS, A = Android, I = iOS; "partial" notes are given in the next section). "Default permission set" lists what `<name>:default` grants, read from the plugin's `permissions/default.toml`. Versions are the crate and npm version at that commit (they matched npm for the three checked with `npm view`: sql 2.6.0, store 2.5.0, updater 2.14.0).

| Add command (Bun) | Purpose | Platforms | Version | `<name>:default` grants |
| --- | --- | --- | --- | --- |
| `bun run tauri add autostart` | Launch the app at system startup | W L M | 2.7.0 | `allow-enable`, `allow-disable`, `allow-is-enabled` |
| `bun run tauri add barcode-scanner` | Scan QR / EAN-13 and other barcodes with the camera | A I | 2.5.3 | `allow-cancel`, `allow-check-permissions`, `allow-open-app-settings`, `allow-request-permissions`, `allow-scan`, `allow-vibrate` |
| `bun run tauri add biometric` | Biometric authentication prompt | M A I | 2.5.0 | `allow-authenticate`, `allow-status` |
| `bun run tauri add cli` | Parse the app's command-line arguments | W L M | 2.5.0 | `allow-cli-matches` |
| `bun run tauri add clipboard-manager` | Read and write the system clipboard | W L M, A/I partial | 2.5.0 | nothing (empty set; each operation must be allowed explicitly) |
| `bun run tauri add deep-link` | Make the app the handler for a URL scheme | W L, M/A/I partial | 2.6.2 | `allow-get-current` |
| `bun run tauri add dialog` | Native open/save/message dialogs | W L M, A/I partial | 2.8.3 | `allow-message`, `allow-save`, `allow-open` |
| `bun run tauri add fs` | File system access | W L M, A/I partial | 2.7.1 | `create-app-specific-dirs`, `read-app-specific-dirs-recursive`, `deny-default` |
| `bun run tauri add geolocation` | Device position | A I | 2.5.0 | no `default.toml` in the plugin |
| `bun run tauri add global-shortcut` | System-wide keyboard shortcuts | W L M | 2.4.1 | nothing (empty set) |
| `bun run tauri add haptics` | Haptic feedback / vibration | A I | 2.4.2 | no `default.toml` in the plugin |
| `bun run tauri add http` | HTTP client implemented in Rust (`fetch`-like API) | W L M A I | 2.8.3 | `allow-fetch`, `allow-fetch-cancel`, `allow-fetch-send`, `allow-fetch-read-body`, `allow-fetch-cancel-body` (URLs still need an `allow` scope) |
| `bun run tauri add localhost` | Serve assets from a localhost server instead of the custom protocol (Rust only) | W L M | 2.4.0 | Rust-only, no frontend permissions |
| `bun run tauri add log` | Configurable logging to stdout, files, web view | W L M A I | 2.10.1 | `allow-log` |
| `bun run tauri add nfc` | Read/write NFC tags | A I | 2.4.2 | `allow-is-available`, `allow-scan` |
| `bun run tauri add notification` | Native notifications | W L M A I | 2.7.0 | 17 permissions covering permission checks, notify, channels and listeners |
| `bun run tauri add opener` | Open files and URLs in their default apps | W L M, A/I partial | 2.7.2 | `allow-open-url`, `allow-reveal-item-in-dir`, `allow-default-urls` |
| `bun run tauri add os` | OS information (arch, platform, version, locale) | W L M A I | 2.4.0 | `allow-arch`, `allow-exe-extension`, `allow-family`, `allow-locale`, `allow-os-type`, `allow-platform`, `allow-version` |
| `bun run tauri add persisted-scope` | Persist runtime scope changes across restarts (Rust only) | W L M A I | 2.4.2 | Rust-only |
| `bun run tauri add positioner` | Move windows to well-known screen positions | W L M | 2.4.0 | `allow-move-window`, `allow-move-window-constrained`, `allow-set-tray-icon-state` |
| `bun run tauri add process` | Exit or restart the current process | W L M | 2.4.0 | `allow-exit`, `allow-restart` |
| `bun run tauri add shell` | Spawn child processes; open URLs | W L M, A/I partial | 2.5.0 | `allow-open` (spawning requires a scoped `shell:allow-execute` or `allow-spawn`) |
| `bun run tauri add single-instance` | Ensure only one instance runs (Rust only) | W L M | 2.5.4 | Rust-only |
| `bun run tauri add sql` | SQL databases via sqlx (SQLite, MySQL, PostgreSQL) | W L M A I | 2.6.0 | `allow-close`, `allow-load`, `allow-select` (add `sql:allow-execute` for writes) |
| `bun run tauri add store` | Persistent key-value store saved to a file | W L M A I | 2.5.0 | all store operations (`allow-load`, `allow-get-store`, `allow-set`, `allow-get`, `allow-has`, `allow-delete`, `allow-clear`, `allow-reset`, `allow-keys`, `allow-values`, `allow-entries`, `allow-length`, `allow-reload`, `allow-save`) |
| `bun run tauri add stronghold` | Encrypted secret storage (IOTA Stronghold engine) | W L M A I | 2.4.0 | client/store/record operations (`allow-create-client`, `allow-get-store-record`, `allow-initialize`, `allow-execute-procedure`, `allow-load-client`, `allow-save-secret`, `allow-save-store-record`, `allow-save`) |
| `bun run tauri add updater` | In-app self-update | W L M | 2.14.0 | `allow-check`, `allow-download`, `allow-install`, `allow-download-and-install` |
| `bun run tauri add upload` | Upload/download files over HTTP | W L M A I | 2.5.0 | `allow-upload`, `allow-download` |
| `bun run tauri add websocket` | WebSocket client in Rust, exposed to JS | W L M A I | 2.5.0 | `allow-connect`, `allow-send` |
| `bun run tauri add window-state` | Save and restore window size/position | W L M | 2.5.0 | `allow-filename`, `allow-restore-state`, `allow-save-window-state` |

Two further entries exist in the workspace but are not in the docs plugin directory: `torch` (flashlight control, Android/iOS, 2.0.0) has no docs page and is not in the CLI's known-plugin list, so its `tauri add` behaviour is **UNVERIFIED**. The docs' compatibility-table generator also adds entries named `system-tray` and `window-customization`; these are features of Tauri itself (documented under `learn/`), not plugins you add.

There is one inconsistency in the sources: the biometric plugin's metadata (and therefore the docs table) lists macOS as fully supported, but the CLI's `tauri add` treats `biometric` as mobile-only and will place the dependency under the mobile target. On macOS desktop you would need to move the dependency yourself; this is inferred from the code and **UNVERIFIED** by running it.

## Partial-support notes

The platform metadata attaches these notes to "partial" or caveated entries:

- **clipboard-manager** on Android/iOS: plain-text content only.
- **deep-link** on macOS, Android, iOS: links must be registered in config; runtime registration is not supported.
- **dialog** on Android/iOS: no folder picker.
- **fs**: on Windows, apps installed via MSI or NSIS in `perMachine` or `both` mode need admin rights to write to `$RESOURCES`; no write access to `$RESOURCES` on Linux and macOS; on Android/iOS access is restricted to the app folder by default.
- **notification** on Windows: only works for installed apps; in development it shows the PowerShell name and icon.
- **opener** and **shell** on Android/iOS: only opening URLs via `open` is supported.

## Plugin-specific notes worth knowing

These points come from the individual plugin pages and are the ones most likely to trip up an agent.

- **sql**: `tauri add sql` does not choose a database driver. You must enable one Cargo feature in `src-tauri`: `cargo add tauri-plugin-sql --features sqlite` (or `mysql`, `postgres`). In testing, `tauri add sql` produced `tauri-plugin-sql = "2"` with no feature, and `cargo add ... --features sqlite` changed it to `{ version = "2", features = ["sqlite"] }` **(tested)**. SQLite paths are relative to the app config directory. Placeholders are `$1, $2, ...` for SQLite and PostgreSQL and `?` for MySQL. Migrations are Rust `Migration { version, description, sql, kind: MigrationKind::Up }` values passed via `tauri_plugin_sql::Builder::default().add_migrations("sqlite:mydatabase.db", migrations)`; they run inside a transaction, either at startup when listed in `plugins.sql.preload` or when the frontend calls `Database.load(...)` with that connection string. Full recipe in `09-agent-recipes.md`.
- **store**: `load('store.json', { autoSave: false })` creates or opens a store; `set`, `get`, `save`. If `autoSave` is a number or omitted, changes are written after a debounce (100 ms by default); the store is also saved on graceful exit. `LazyStore` loads on first access. In Rust, use `tauri_plugin_store::StoreExt` and `app.store("store.json")?`; values must be `serde_json::Value`.
- **fs**: permissions without scopes grant no paths and calls fail with `forbidden path`; attach an `allow` scope (see `04-security-capabilities.md`).
- **http**: allowed URLs are configured as a scope on the permission, for example `{ "identifier": "http:default", "allow": [{ "url": "https://*.tauri.app" }], "deny": [{ "url": "https://private.tauri.app" }] }`. Forbidden request headers are dropped unless the Rust `unsafe-headers` feature is enabled.
- **shell**: running a program requires a scoped `shell:allow-execute` entry naming the command (`name`, `cmd`, `args` with optional `validator` regexes, `sidecar`).
- **opener**: `opener:allow-open-path` and `opener:allow-open-url` take `path`/`url` glob scopes.
- **single-instance**: the docs say it must be the **first** plugin registered. The deep-linking page repeats this.
- **updater**: needs signing keys, `pubkey`, `endpoints` and `bundle.createUpdaterArtifacts`; details in `07-distribute.md`. The docs' JavaScript example uses `relaunch()` from `@tauri-apps/plugin-process`, so add the `process` plugin too if you want to restart after updating.
- **log**: by default logs to stdout and to a file in the app log directory; `clear_targets()` removes the defaults. Rust code logs with the `log` crate (`log = "0.4"`).
