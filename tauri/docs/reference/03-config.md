# `tauri.conf.json` Configuration

Source pages:
- https://v2.tauri.app/reference/config/ (fetched)
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/configuration-files.mdx
- https://github.com/tauri-apps/tauri/blob/8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f/crates/tauri-cli/config.schema.json (the JSON schema the config reference is generated from; used for defaults and field descriptions)
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/windows-installer.mdx (WebView2 install modes)
- https://github.com/tauri-apps/create-tauri-app/blob/379add21351259c03d3a61fa44aea62485b50cc9/templates/_base_/src-tauri/%25(v2)%25tauri.conf.json.lte

Verified on 2026-10-21

## What the file does

`src-tauri/tauri.conf.json` is the main configuration file. It is read by both the Tauri CLI (to know how to run and bundle the app) and the Tauri runtime (to know which windows to open and how to secure them). It describes where the web assets come from, the app's identity, the windows, the security policy, the bundle formats, and per-plugin settings. The file's `$schema` field points to `https://schema.tauri.app/config/2`, which gives editors autocompletion.

The top-level keys are `$schema`, `productName`, `mainBinaryName`, `version`, `identifier`, `app`, `build`, `bundle` and `plugins`.

## A complete minimal example

This is the config produced by `create-tauri-app` for a React + TypeScript project using Bun, shown so later sections can refer to it:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "my-app",
  "version": "0.1.0",
  "identifier": "com.example.myapp",
  "build": {
    "beforeDevCommand": "bun run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "bun run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "my-app", "width": 800, "height": 600 }],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

## Identity fields

The following fields identify the application.

- **`productName`**: the human-readable name used for bundle names and platform metadata. It may not contain `/ \ : * ? " < > |`. On Linux it is converted to kebab-case for package names.
- **`version`**: a semver string, or a path to a `package.json` whose `version` field should be used. If omitted, the version from `src-tauri/Cargo.toml` is used. The distribution guide recommends setting it here.
- **`identifier`** (required): a reverse-domain-style unique ID such as `com.tauri.example`. It may contain only alphanumerics, hyphens and periods. The placeholder `com.tauri.dev` is rejected by `tauri build`.
- **`mainBinaryName`**: optional override of the output executable name, written without an extension.

## `build`: how the frontend is run and packaged

The `build` object connects the Tauri CLI to the frontend tooling.

- **`beforeDevCommand`**: a shell command run before `tauri dev`, typically the frontend dev server (`bun run dev`). It can also be an object with `script`, `cwd` and `wait` (`wait` defaults to `false`).
- **`devUrl`**: the URL of the dev server that the window loads during `tauri dev`. It must match the port the frontend server listens on.
- **`beforeBuildCommand`**: a shell command run before `tauri build`, typically the frontend production build (`bun run build`). It can also be an object with `script` and `cwd`.
- **`beforeBundleCommand`**: same shape, run before the bundling phase.
- **`frontendDist`**: what to embed in the production app. It may be a directory path relative to `src-tauri` (for Vite, `../dist`), a URL, or a list of files. A directory is embedded recursively and `index.html` is served as the entry point.

## `app`: runtime behaviour

### `app.windows`

`app.windows` is an array of window definitions that Tauri creates at startup (default `[]`). The defaults below come from the config schema:

| Field | Default | Meaning |
| --- | --- | --- |
| `label` | `"main"` | Window identifier; must be alphanumeric. Capabilities refer to windows by this label, not by title. |
| `title` | `"Tauri App"` | Window title |
| `width` / `height` | `800` / `600` | Size in logical pixels |
| `resizable` | `true` | When false, the maximize button is disabled too |
| `fullscreen` | `false` | Start fullscreen |
| `decorations` | `true` | Show native borders and title bar |
| `center` | `false` | Start centered |
| `visible` | `true` | Start visible |
| `url` | `"index.html"` | Page the web view loads |
| `create` | `true` | When `false`, the window is not created at startup; you build it in Rust from this config (via `WebviewWindowBuilder::from_config`) |

Because the label defaults to `"main"`, the generated capability file (`"windows": ["main"]`) matches the single default window.

### `app.withGlobalTauri`

Default `false`. When `true`, the Tauri JavaScript API is injected as `window.__TAURI__`, so frontends without a bundler can call, for example, `window.__TAURI__.core.invoke`.

### `app.security`

The security object holds the following keys (details are in `04-security-capabilities.md`):

- **`csp`**: the Content Security Policy injected into the built app's HTML, as a string or as an object mapping directives to sources. If `devCsp` is not set, it is also used in development. `null` (the template's value) means no CSP is injected.
- **`devCsp`**: a separate CSP used only in development.
- **`freezePrototype`**: default `false`. When true, `Object.freeze(Object.prototype)` runs in every web view to harden against prototype pollution.
- **`dangerousDisableAssetCspModification`**: default `false`. Turns off the nonces and hashes Tauri normally injects into the CSP.
- **`assetProtocol`**: `{ "enable": false, "scope": [] }` by default; controls the `asset:` protocol for loading local files.
- **`pattern`**: default `{ "use": "brownfield" }`. Set `{ "use": "isolation", "options": { "dir": "../dist-isolation" } }` to use the isolation pattern.
- **`capabilities`**: default `[]`. When empty, every capability file in `src-tauri/capabilities/` is used. When it lists identifiers or inline capability objects, only those are used.
- **`headers`**: extra HTTP headers added to responses Tauri serves to the web view.

## `bundle`: packaging

The `bundle` object controls installers and packages (see `07-distribute.md` for workflows).

- **`active`**: schema default `false`; the template sets it to `true`. When false, the build produces only the executable.
- **`targets`**: default `"all"`; otherwise one value or an array of `deb`, `rpm`, `appimage`, `nsis`, `msi`, `app`, `dmg` (case-insensitive).
- **`icon`**: a list of icon file paths, normally the output of `tauri icon`.
- **`createUpdaterArtifacts`**: default `false`. `true` makes the build produce updater bundles and `.sig` signatures; `"v1Compatible"` is for apps migrating from Tauri v1.
- **`resources`**: extra files to ship, as a list of paths/globs or a map from source to target. They are placed under the app's resource directory.
- **`externalBin`**: extra binaries (sidecars). Tauri looks for files suffixed with the target triple, for example `my-binary-x86_64-apple-darwin`.
- **`windows`**: Windows signing and installer settings, including `certificateThumbprint` (SHA-1 of the signing certificate), `digestAlgorithm` (SHA-256 recommended), `timestampUrl`, `signCommand` (custom signing command, using `%1` as the file placeholder), and `webviewInstallMode`. The install mode's default is `{ "type": "downloadBootstrapper", "silent": true }`. The distribution guide lists the alternatives `embedBootstrapper` (about 1.8 MB extra), `offlineInstaller` (about 127 MB, works offline), `fixedVersion` (about 180 MB) and `skip` (not recommended).
- **`macOS`**: includes `signingIdentity` and `minimumSystemVersion` (default `"10.13"`).

## `plugins`

`plugins` is a map from plugin name to that plugin's settings, default `{}`. Examples: `plugins.updater.pubkey` and `plugins.updater.endpoints` for the updater, and `plugins.sql.preload` for the SQL plugin.

## Other config formats

JSON is the default. JSON5 (`tauri.conf.json5`) or TOML (`Tauri.toml`) can be used by adding the `config-json5` or `config-toml` Cargo feature to **both** `tauri` and `tauri-build`. TOML allows kebab-case keys. Field names are case-sensitive in every format.

## Platform-specific files and merging

Tauri also reads an optional per-platform file next to the main one: `tauri.linux.conf.json`, `tauri.windows.conf.json`, `tauri.macos.conf.json`, `tauri.android.conf.json`, `tauri.ios.conf.json` (or the `Tauri.<platform>.toml` equivalents). The platform file is merged onto the main config using JSON Merge Patch (RFC 7396). The docs stress one consequence: objects merge key by key, but **arrays replace the base array entirely**. This includes `app.windows`, so a platform-specific window entry replaces the base entry and any field left out falls back to its default, not to the base config's value.

The CLI commands `dev`, `build`, `bundle`, `android dev`, `android build`, `ios dev` and `ios build` also accept `--config <json-or-path>`, merged the same way. The docs' example ships a separate beta app:

```json
// src-tauri/tauri.beta.conf.json
{ "productName": "My App Beta", "identifier": "com.myorg.myappbeta" }
```

```sh
bun tauri build --config src-tauri/tauri.beta.conf.json
```

## Related files

`Cargo.toml` declares the `tauri` and `tauri-build` crates. The docs say these should generally be on the same minor version as the Tauri CLI, and that `tauri dev`/`tauri build` manage the `tauri` crate's feature list automatically based on the config. `Cargo.lock` should be committed. `package.json` holds the frontend scripts, which are usually wired to `beforeDevCommand` and `beforeBuildCommand`.
