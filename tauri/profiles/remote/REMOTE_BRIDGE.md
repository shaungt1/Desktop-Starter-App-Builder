# Calling Rust commands from the hosted web app (remote profile)

In the remote profile the main window shows your hosted site
(`remoteUrl` in app.config.json; src-tauri/src/window.rs opens it).
Tauri treats remote pages as untrusted: by default the hosted site cannot
call any command or plugin.

To let it call specific commands, add a capability file
`src-tauri/capabilities/remote.json` that names the site's URL pattern and
only the permissions it needs:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "remote",
  "description": "What the hosted site may call",
  "windows": ["main"],
  "remote": { "urls": ["https://app.example.com/*"] },
  "permissions": ["core:event:default"]
}
```

App commands defined in Rust (`#[tauri::command]`) are reachable from a
remote origin only when the app defines command permissions in build.rs
(`tauri_build::Attributes::new().app_manifest(AppManifest::new().commands(&[...]))`)
and grants them here. Grant the smallest set; never grant fs, shell or sql to a remote origin.

The hosted site calls commands by bundling `@tauri-apps/api` and calling
`invoke`; Tauri injects the IPC bridge into the page. In a normal browser the
bridge does not exist, so check `isTauri()` from `@tauri-apps/api/core` first.

There is no automatic offline screen in this profile; show your own offline
state in the hosted app (for example with a service worker).
