# Security: Capabilities, Permissions, Scopes, CSP, Isolation

Source pages:
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/security/capabilities.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/security/permissions.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/security/scope.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/security/csp.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/concept/Inter-Process%20Communication/isolation.md
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/learn/Security/using-plugin-permissions.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/plugin/file-system.mdx (scope example)
- https://github.com/tauri-apps/tauri/blob/8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f/crates/tauri-cli/src/add.rs (what `tauri add` writes to capabilities)
- https://github.com/tauri-apps/tauri/blob/8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f/crates/tauri/src/ipc/authority.rs (runtime "not allowed" error text)
- https://v2.tauri.app/reference/cli/ (fetched; `permission add`, `capability new`)

Verified on 2026-10-21

## The model in one paragraph

Tauri's frontend runs in a web view, and every call it makes into Rust passes through an access-control layer. Three ideas make up that layer. A **permission** is a named description of what is allowed: it can enable or deny specific commands and can attach a scope. A **scope** is data that narrows what an allowed command may touch, such as which file paths or URLs. A **capability** binds a set of permissions to a set of windows or web views (by label), optionally limited to certain platforms or remote URLs. Nothing a plugin exposes is reachable from the frontend until a capability grants a permission for it.

## Capabilities

Capability files live in `src-tauri/capabilities/` as JSON (or JSON5) or TOML. Every file in that folder is enabled automatically. If `app.security.capabilities` in `tauri.conf.json` is set to a non-empty list, only the capabilities named there (by identifier, or written inline as objects) are used.

### The default capability file

`create-tauri-app` generates this file:

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": ["core:default", "opener:default"]
}
```

The fields mean the following. `$schema` points to a JSON schema that `tauri-build` generates under `src-tauri/gen/schemas/` (for example `desktop-schema.json` or `mobile-schema.json`), which gives editor autocompletion of every available permission. `identifier` names the capability. `windows` lists window labels the capability applies to (`"*"` matches all). `permissions` lists permission identifiers, or objects that add scopes to a permission.

`core:default` is a set covering Tauri's built-in API modules. In the generated schema it expands to `core:path:default`, `core:event:default`, `core:window:default`, `core:webview:default`, `core:app:default`, `core:image:default`, `core:resources:default`, `core:menu:default` and `core:tray:default`.

### Platform-specific and remote capabilities

The optional `platforms` array restricts a capability to some of `linux`, `macOS`, `windows`, `iOS`, `android`; without it the capability applies everywhere. For example, a desktop-only capability:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "desktop-capability",
  "windows": ["main"],
  "platforms": ["linux", "macOS", "windows"],
  "permissions": ["global-shortcut:allow-register"]
}
```

By default only the bundled app's own pages can use the Tauri API. A `remote` block (`"remote": { "urls": ["https://*.tauri.app"] }`) grants a capability to remote origins. The docs caution that on Linux and Android Tauri cannot tell an embedded `<iframe>` apart from the window itself, so this must be used carefully.

### Security notes from the docs

- A window or web view in several capabilities receives the union of all their permissions.
- Boundaries follow window **labels**, not titles. The docs recommend that only higher-privileged windows be allowed to create new windows.
- Capabilities limit the damage a compromised frontend can do. They do not protect against insecure Rust code, overly broad scopes, incorrect scope checks inside a command, web view vulnerabilities, or supply-chain compromise.

### Your own app commands

All commands registered with `invoke_handler` are, by default, callable from every window. To restrict app commands with the same permission system, the docs point to `tauri_build::AppManifest::commands` in `build.rs`:

```rust
// src-tauri/build.rs
fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["your_command"])),
    )
    .unwrap();
}
```

What permission identifiers are then generated for app commands, and how they must be referenced in a capability, is not spelled out on the capabilities page; that detail is **UNVERIFIED** here.

## Permissions

A permission is defined in TOML (application developers can write capabilities in JSON/JSON5/TOML, but permission files only in TOML). A minimal definition:

```toml
[[permission]]
identifier = "my-identifier"
description = "What this allows."
commands.allow = ["read_file"]

[[permission.scope.allow]]
my-scope = "$HOME/*"

[[permission.scope.deny]]
my-scope = "$HOME/secret"
```

Permissions can be grouped into a **set** under a new identifier:

```toml
# src-tauri/permissions/home-read-extends.toml
[[set]]
identifier = "allow-home-read-extended"
description = "Non-recursive read access and mkdir in $HOME."
permissions = ["fs:read-files", "fs:scope-home", "fs:allow-mkdir"]
```

### Identifier format

Plugin permissions are written `<plugin>:<name>`, where `<plugin>` is the crate name without the `tauri-plugin-` prefix. Common shapes are `<plugin>:default` (the plugin's default set) and `<plugin>:allow-<command>` / `<plugin>:deny-<command>` (single commands, auto-generated by plugins). App-level permissions need no prefix. Identifiers use lower-case ASCII letters and are capped at 116 characters.

### How plugins add permissions

A plugin ships its permissions in its own `permissions/` folder, including a `default.toml` describing a reasonable minimal set. The docs state that the default permission is automatically added to the app's configuration when the plugin is added with the Tauri CLI. The `tauri add` source confirms this: unless the plugin is Rust-only, it runs the equivalent of `tauri permission add <plugin>:default`. In testing **(tested)**:

- `bun run tauri add store` appended `store:default` to `capabilities/default.json`.
- `bun run tauri add sql` appended `sql:default` to `capabilities/default.json`.
- `bun run tauri add updater` (a desktop-only plugin) found no capability restricted to desktop platforms, created `capabilities/desktop.json` with identifier `desktop-capability`, `platforms: ["macOS","windows","linux"]`, `windows: ["main"]`, and put `updater:default` there.

A plugin's `default` set is often not everything you need. For example, `sql:default` grants only `allow-close`, `allow-load` and `allow-select`, so running `INSERT`/`UPDATE` from JavaScript also needs `sql:allow-execute`.

The CLI can edit capability files directly:

- `tauri permission add <IDENTIFIER> [CAPABILITY]` adds a permission to a capability.
- `tauri capability new [IDENTIFIER] --description ... --windows ... --permission ... --format json|toml -o <file>` creates a new capability file.

## Scopes

A scope narrows what an allowed command may act on. Scopes come in `allow` and `deny` lists, and **deny always wins** over allow. The shape of a scope entry is defined by each plugin: the file-system plugin uses `{ "path": "<glob>" }`, the HTTP plugin and opener use `{ "url": "<glob>" }`. The docs warn that the command implementation is responsible for enforcing the scope, so a custom command must check its own scope correctly.

In a capability, a scope is attached by writing the permission as an object:

```json
{
  "permissions": [
    "fs:default",
    { "identifier": "fs:allow-exists", "allow": [{ "path": "$APPDATA/*" }] }
  ]
}
```

The file-system page has an explicit caution that matters for agents: enabling a permission such as `fs:allow-exists` **without** an `allow` scope grants access to no paths, and calls fail at runtime with a `forbidden path` error. Path variables usable in scopes include `$APPCONFIG`, `$APPDATA`, `$APPLOCALDATA`, `$APPCACHE`, `$APPLOG`, `$HOME`, `$AUDIO`, `$CACHE`, `$CONFIG` and others listed on that page.

## What a permission failure looks like

When the frontend calls something it is not allowed to, the `invoke` promise rejects. The docs show this example message from the file-system tutorial:

```
Unhandled Promise Rejection: fs.write_text_file not allowed. Permissions associated with this command: fs:allow-app-write, fs:allow-app-write-recursive, ...
```

The runtime source (`ipc/authority.rs`) produces variants of `"<plugin>.<command> not allowed ..."`, including `"... not allowed on window \"<label>\", webview \"<label>\", URL: ..."` when a permission exists but is not granted to that window, and `"... not allowed on origin [...]"` for remote origins. The fix is always to grant one of the listed permissions to the calling window's capability (and a scope, if the command is scoped).

## Content Security Policy (CSP)

A Content Security Policy is a browser rule set that restricts which scripts, styles, images and connections a page may load; it reduces the impact of cross-site scripting. In Tauri the CSP is only applied when it is set in `app.security.csp` (the template sets `null`, meaning none). At compile time Tauri hashes local scripts and adds nonces for styles and external scripts, appending them to your policy, so you only list what is specific to your app. The docs recommend making it as strict as possible and avoiding remote scripts such as CDN-hosted code. An example from Tauri's own API example app, written in object form:

```json
"csp": {
  "default-src": "'self' customprotocol: asset:",
  "connect-src": "ipc: http://ipc.localhost",
  "font-src": ["https://fonts.gstatic.com"],
  "img-src": "'self' asset: http://asset.localhost blob: data:",
  "style-src": "'unsafe-inline' 'self' https://fonts.googleapis.com"
}
```

The `connect-src` entry `ipc: http://ipc.localhost` is what lets the frontend reach Tauri's IPC when a CSP is active. Frontends that use WebAssembly (including Rust frontends) need `'wasm-unsafe-eval'` in `script-src`. `devCsp` can set a different policy for development.

## Isolation pattern

The isolation pattern inserts a small, trusted JavaScript application between the frontend and Tauri Core. It runs in a sandboxed `<iframe>`, receives every IPC message, may inspect or modify it, and then the message is encrypted with AES-GCM using a key generated at each app start before it reaches Core. Its purpose is to defend against malicious or compromised frontend dependencies. The docs recommend using it whenever possible, keeping the isolation app minimal, and note that it adds encryption overhead and that external files do not load correctly in sandboxed iframes on Windows (Tauri inlines scripts at build time to work around this).

Setup example from the docs:

```html
<!-- ../dist-isolation/index.html -->
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Isolation Secure Script</title></head>
  <body><script src="index.js"></script></body>
</html>
```

```js
// ../dist-isolation/index.js
window.__TAURI_ISOLATION_HOOK__ = (payload) => {
  console.log('hook', payload); // validate or modify here
  return payload;
};
```

```json
// tauri.conf.json
{
  "build": { "frontendDist": "../dist" },
  "app": {
    "security": {
      "pattern": { "use": "isolation", "options": { "dir": "../dist-isolation" } }
    }
  }
}
```

The default pattern, used when nothing is configured, is `brownfield`, in which the frontend talks to Core directly.
