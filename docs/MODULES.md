# Modules

<!-- Generated from config/catalog.json by `bun run docs:modules`. Do not edit by hand. -->

A module is an optional capability added to a generated app: its code, its
packages and, for Tauri, its Rust crates and permission grants. Modules are
chosen in the project plan (`modules`) or added later with
`bash start.sh module add <id> <app>`. A module that requires another one
brings it in automatically. Modules marked *manual* are documented recipes
rather than generated code, because the right choice differs per product.

The table below summarizes availability; each module is then described in full. A Tauri entry of
"yes, mobile" means the module also builds for the Android and iOS targets; plans with those targets
accept only such modules.

| Module | Electron | Tauri 2 | Requires |
| --- | --- | --- | --- |
| `database` | yes | yes, mobile | — |
| `secure-storage` | yes | yes | — |
| `auth-oidc` | yes | yes | secure-storage |
| `auto-update` | yes | yes | — |
| `filesystem` | yes | yes | — |
| `background` | yes | yes | — |
| `crash-reporting` | yes | — | — |
| `database-prisma` | manual | — | — |
| `peer-to-peer` | manual | manual | — |

Each section below lists what the module does, the packages it adds per base, its plan options and the steps a person must complete outside the code.

## Local database (SQLite) (`database`)

Structured app data in a SQLite file in the user-data folder, with ordered migrations and an example notes repository.

- **Electron** (`electron/modules/database`): no extra npm packages.
- **Tauri 2** (`tauri/modules/database`): npm: `@tauri-apps/plugin-sql`; crates: `tauri-plugin-sql`.

## Secure storage (`secure-storage`)

Encrypted storage for tokens and credentials using the operating system key store. The interface can save but never read back a secret.

- **Electron** (`electron/modules/secure-storage`): no extra npm packages.
- **Tauri 2** (`tauri/modules/secure-storage`): no extra npm packages; crates: `keyring`; commands: `secret_status`, `secret_has`, `secret_set`, `secret_delete`.

## Sign-in (OpenID Connect + PKCE) (`auth-oidc`)

Sign-in through the system browser with PKCE; the provider redirects to <scheme>://auth/callback. Works with any OpenID Connect provider (Auth0, Okta, Entra ID, Keycloak, Cognito, Supabase, Google...).

Requires: `secure-storage`.

- **Electron** (`electron/modules/auth-oidc`): no extra npm packages.
- **Tauri 2** (`tauri/modules/auth-oidc`): no extra npm packages; crates: `reqwest`, `sha2`, `base64`, `rand`, `tokio`, `url`; commands: `auth_status`, `auth_sign_in`, `auth_sign_out`.

Plan options, under `moduleOptions["auth-oidc"]`:

- `issuer` (required): OpenID Connect issuer URL, e.g. https://your-tenant.us.auth0.com
- `clientId` (required): Client id of a public (native/SPA) application at the provider, with no client secret
- `scopes`: Space- or comma-separated scopes (default: openid profile email offline_access)
- `audience`: API audience, for providers that need one (Auth0)

Steps outside the code:

1. At the identity provider, create a public/native application and add <scheme>://auth/callback as an allowed redirect URI (the scheme comes from the plan).
2. Linux: the deep link is registered when the .deb is installed; during development, test sign-in on Windows/macOS or with an installed build.

## Automatic updates (`auto-update`)

Checks for and installs new versions. Electron: GitHub releases of a public repository or any static file host. Tauri: signed update manifests from any URL.

- **Electron** (`electron/modules/auto-update`): npm: `update-electron-app`.
- **Tauri 2** (`tauri/modules/auto-update`): no extra npm packages; crates: `tauri-plugin-updater`, `tauri-plugin-process`; commands: `update_check`, `update_install`.

Plan options, under `moduleOptions["auto-update"]`:

- `source`: Electron only: github (public repository) or static (any file host)
- `baseUrl`: Electron static source: base URL where make output is uploaded
- `endpoint`: Tauri: URL of latest.json, e.g. https://github.com/OWNER/REPO/releases/latest/download/latest.json
- `pubkey`: Tauri: public key printed by `bun run tauri signer generate`

Steps outside the code:

1. Electron github source: set repository in the plan, make the repository public, and publish with `bun run publish`.
2. Electron static source: upload `out/make` contents to <baseUrl>/<platform>/<arch>/ for each release.
3. Tauri: run `bun run tauri signer generate -w ~/.tauri/app.key`, put the public key in moduleOptions.auto-update.pubkey, and set TAURI_SIGNING_PRIVATE_KEY (and _PASSWORD) when building releases.

## File access (`filesystem`)

Native open/save dialogs and reading or writing the files the user picked. Nothing outside the user's choices is reachable from the interface.

- **Electron** (`electron/modules/filesystem`): no extra npm packages.
- **Tauri 2** (`tauri/modules/filesystem`): no extra npm packages; crates: `tauri-plugin-dialog`; commands: `fs_open_text_file`, `fs_save_text_file`.

## Tray and background work (`background`)

Tray icon, start at login, and work that continues when the window is closed (Electron: a utilityProcess worker; Tauri: an async Rust task).

- **Electron** (`electron/modules/background`): no extra npm packages.
- **Tauri 2** (`tauri/modules/background`): no extra npm packages; crates: `tauri`, `tauri-plugin-autostart`, `tokio`; commands: `background_status`, `background_set_launch_at_login`.

## Crash reporting (Sentry) (`crash-reporting`)

Sends errors and native crashes from every process to a Sentry project.

- **Electron** (`electron/modules/crash-reporting`): npm: `@sentry/electron`.

Plan options, under `moduleOptions["crash-reporting"]`:

- `dsn`: Sentry project DSN (reporting stays off until set)
- `environment`: Environment name (default production)

Steps outside the code:

1. Upload source maps for readable stack traces (Sentry's Vite plugin) when you set up release builds.

## Prisma ORM instead of the built-in SQLite layer (`database-prisma`)

For apps whose schema already lives in Prisma on a server. Not generated automatically because it adds a code-generation step and, with the better-sqlite3 adapter, a native module that must be rebuilt for Electron.

Steps:

1. bun add @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3 && bun add -d prisma
2. Add `"better-sqlite3"` to trustedDependencies in package.json and keep AutoUnpackNativesPlugin in forge.config.ts (already present).
3. Create prisma/schema.prisma with provider = "sqlite"; run `bunx prisma generate` before `bun run dev` and in CI.
4. Create the client only in the main process with new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${path.join(app.getPath('userData'), 'app.db')}` }) }).
5. Ship migrations by running `prisma migrate diff` to SQL and applying them at start-up (the migration engine is not bundled), or ship a pre-migrated database file and copy it to userData on first run.
6. Electron Forge rebuilds better-sqlite3 for Electron during `bun run dev` and `bun run package`; verify with `bun run test:e2e`.

## Peer-to-peer transport (`peer-to-peer`)

Direct device-to-device connections. Chosen per product, so it is documented rather than generated.

Steps:

1. Pick the transport first: iroh (QUIC with relay fallback; Rust-first, strongest NAT traversal), libp2p (cross-language, modular), Hyperswarm (JavaScript DHT + hole punching), or WebRTC data channels (needs a signalling server).
2. Electron: run the transport in a utilityProcess worker (add the background module and put it in src/main/workers/).
3. Tauri: use the Rust crate directly (iroh, libp2p, quinn) in a tokio task started from setup(), and stream progress to the interface with a Channel.
4. Never put key material in a QR code; use a short-lived pairing token.
