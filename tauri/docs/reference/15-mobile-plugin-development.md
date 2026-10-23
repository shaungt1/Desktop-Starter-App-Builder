# Developing Tauri Plugins with Native Mobile Code

Source pages:
- https://github.com/tauri-apps/tauri-docs (git clone, commit `11934e365dfea50ef116f51cb7e26742554a34c6`), files under `src/content/docs/`:
  - `develop/Plugins/index.mdx` (https://v2.tauri.app/develop/plugins/)
  - `develop/Plugins/develop-mobile.mdx` (https://v2.tauri.app/develop/plugins/develop-mobile/)
  - `concept/architecture.mdx` (https://v2.tauri.app/concept/architecture/), section "Plugins"
- https://github.com/tauri-apps/plugins-workspace (git clone, commit `df594206ce03f67e25da04283dea023815a45058`): which official plugins contain `android/` and `ios/` native code
- https://github.com/tauri-apps/tauri (sparse clone, commit `8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f`): `crates/tauri-cli/CHANGELOG.md` (plugin scaffolding fixes)
- `@tauri-apps/cli` 2.12.4 run locally: `tauri plugin --help`, `tauri plugin new --help`, `tauri plugin android --help`, `tauri plugin ios --help`, and a real `tauri plugin new demo-camera --android --ios --no-example` whose output files are quoted below **(tested)**

Verified on 2026-10-22

## What this page covers

A Tauri **plugin** is a reusable package that adds a capability to a Tauri app: Rust code, commands the frontend can call, permissions that control those commands, and, optionally, native Android and iOS code. This page explains when an app needs its own plugin, how to create one with Android (Kotlin) and iOS (Swift) code, how the three languages call each other, how permissions and lifecycle hooks work, and how the app then uses the plugin. It builds on `05-ipc.md` (commands, events and channels) and `04-security-capabilities.md` (capabilities and permissions), and on `14-mobile.md` for the mobile toolchain.

The terms below are used throughout:

- **Kotlin** is the language used for Android apps; **Swift** is the language used for iOS apps. Both are compiled by the platform's own tools (Gradle on Android, Xcode on iOS), not by Rust.
- **Crate** is a Rust package; **NPM package** is a JavaScript package.
- **Guest bindings** (also called the plugin's JavaScript API) are small TypeScript functions that wrap `invoke` calls so the app's frontend can call the plugin's commands by name.
- **Swift package** is a library managed by the Swift Package Manager (SPM); **Android library** is a Gradle module that produces code for another Android project to include.
- **JNI** (Java Native Interface) and **FFI** (Foreign Function Interface) are the standard ways for Kotlin and Swift, respectively, to call compiled native functions such as Rust ones.

## 1. When an app needs a custom mobile plugin

Tauri's core gives an app windows, IPC and events; everything else comes from plugins. The architecture page describes a plugin as something that (1) enables Rust code to do something, (2) provides glue to integrate into an app, and (3) provides a JavaScript API for the Rust code. The plugin guide adds that plugins can "handle commands with Rust, Kotlin or Swift code", and the mobile guide that "Plugins can run native mobile code written in Kotlin (or Java) and Swift".

The decision rule that follows from these pages is set out below.

1. **Use an official plugin when one exists for the feature.** `06-plugins.md` lists every official plugin with its platform support. In the plugins-workspace at the commit read, the plugins that ship native mobile code are: `barcode-scanner`, `biometric`, `clipboard-manager`, `deep-link` (Android only), `dialog`, `fs` (Android only), `geolocation`, `haptics`, `log` (iOS only), `nfc`, `notification`, `opener`, `shell` and `torch`. Their source is also the best working reference for writing a new plugin.
2. **Use ordinary app commands when the feature can be written in Rust alone.** A `#[tauri::command]` in the app's `lib.rs` (see `05-ipc.md`) works on mobile as well as desktop, as long as its Rust code and crates compile for Android and iOS.
3. **Write a custom plugin when the feature needs an Android or iOS platform API from Kotlin or Swift** (for example a system service, a permission dialog, or a vendor SDK distributed as an Android library or Swift package) and no official plugin covers it. App commands cannot contain Kotlin or Swift; the plugin's `android` and `ios` projects are the documented place for that code.
4. **Also write a plugin to reuse a feature across several apps**, even on desktop only, because the plugin bundles its commands, permissions, configuration and JavaScript API in one package.

## 2. Creating the plugin project

### 2.1 The command

The plugin guide gives `npx @tauri-apps/cli plugin new [name]`, with `--android` and/or `--ios` to include mobile projects and `--no-api` to skip the NPM package. The CLI help (2.12.4) lists these further options: `--mobile` (both Android and iOS), `--no-example` (no example app), `-d/--directory <DIR>`, `-a/--author <AUTHOR>`, `--ios-framework spm|xcode` (default `spm`, a Swift Package Manager project), `--github-workflows` and `-t/--tauri-path`.

From any folder, Bun first, then npm (all host operating systems; the iOS project files are generated on Linux and Windows too, but can only be built on macOS):

```sh
bunx @tauri-apps/cli plugin new demo-camera --android --ios
```

```sh
npx @tauri-apps/cli plugin new demo-camera --android --ios
```

`bunx` is Bun's equivalent of `npx`; the Tauri docs show only the `npx` form. Inside an existing Tauri app the project's own CLI can be used instead (`bun run tauri plugin new demo-camera --android --ios` / `npm run tauri plugin new -- demo-camera --android --ios`); this was the form tested.

The command creates `tauri-plugin-demo-camera/` in the current folder. The plugin name must follow Tauri's identifier rules from the plugin guide: lower-case ASCII letters, digits and hyphens only, no leading or trailing hyphen, at most 64 characters. Otherwise the build fails with `identifiers can only include lowercase ASCII, hyphens which are not leading or trailing, and a single colon if using a prefix`.

**The command is interactive.** With `--android`, it asks "What should be the Android Package ID for your plugin?" and proposes `com.plugin.<name with hyphens as underscores>` (here `com.plugin.demo_camera`). Run from a shell with no terminal attached, as an agent's tool often is, it failed with `failed to prompt input: IO error: not a terminal` **(tested)**; the `plugin new` command has no `--ci` flag. An agent should run it in an interactive terminal, or ask the user to run it.

To add mobile projects to an existing plugin, the CLI and the mobile guide use `plugin android init` and `plugin ios init` (the plugin guide's overview says `plugin android add` / `plugin ios add`, but those subcommands do not exist in CLI 2.12.4; only `init` does):

```sh
bun run tauri plugin android init
bun run tauri plugin ios init
```

```sh
npm run tauri plugin android init
npm run tauri plugin ios init
```

### 2.2 The generated files

The tree below is what `plugin new demo-camera --android --ios --no-example` produced **(tested)**, with the role of each file taken from the plugin guide.

```text
tauri-plugin-demo-camera/
├── Cargo.toml                 Rust crate metadata (tauri 2.12.5, tauri-plugin 2.7.2 as build dependency)
├── build.rs                   Lists commands; generates permissions; links the android/ and ios/ projects
├── src/
│   ├── lib.rs                 Plugin builder, setup, extension trait; picks desktop or mobile implementation
│   ├── commands.rs            Commands the web view can call
│   ├── desktop.rs             Desktop implementation (pure Rust)
│   ├── mobile.rs              Mobile implementation (forwards calls to Kotlin/Swift)
│   ├── models.rs              Shared request/response structs
│   └── error.rs               Error type
├── permissions/default.toml   The plugin's default permission set
├── android/                   Android library (Kotlin): build.gradle.kts, src/main/java/ExamplePlugin.kt, Example.kt
├── ios/                       Swift package: Package.swift, Sources/ExamplePlugin.swift
├── guest-js/index.ts          TypeScript guest bindings (built into dist-js/ by rollup)
├── package.json               NPM package "tauri-plugin-demo-camera-api"
└── rollup.config.js, tsconfig.json
```

The generated Android library targets `compileSdk = 37` and `minSdk = 21`, and the Swift package declares `.iOS(.v15)` and `.macOS(.v10_13)` **(tested)**. The plugin guide's naming section says the crate is `tauri-plugin-{name}` and the NPM package `tauri-plugin-{name}-api`, and recommends publishing the NPM package under a scope following the convention `@scope-name/plugin-{name}`.

## 3. How a call travels: Rust, Kotlin and Swift

The template splits each plugin into a desktop implementation and a mobile implementation. The desktop one does the work in Rust; the mobile one "sends a message to the native mobile code to execute a function and get a result back" (mobile guide). The generated `lib.rs` chooses between them at compile time:

```rust
// src/lib.rs (generated)
#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

#[cfg(desktop)]
use desktop::DemoCamera;
#[cfg(mobile)]
use mobile::DemoCamera;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("demo-camera")
    .invoke_handler(tauri::generate_handler![commands::ping])
    .setup(|app, api| {
      #[cfg(mobile)]
      let demo_camera = mobile::init(app, api)?;
      #[cfg(desktop)]
      let demo_camera = desktop::init(app, api)?;
      app.manage(demo_camera);
      Ok(())
    })
    .build()
}
```

On mobile, `mobile.rs` registers the native class and keeps a `PluginHandle` that forwards calls to it:

```rust
// src/mobile.rs (generated)
#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_demo_camera);

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<DemoCamera<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.plugin.demo_camera", "ExamplePlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_demo_camera)?;
  Ok(DemoCamera(handle))
}

pub struct DemoCamera<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> DemoCamera<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    self.0.run_mobile_plugin("ping", payload).map_err(Into::into)
  }
}
```

The two registration calls are the link between the languages. `register_android_plugin` takes the Kotlin package name and class name. `register_ios_plugin` takes the symbol declared by `ios_plugin_binding!`, which must match the `@_cdecl` name exported by the Swift file. `run_mobile_plugin("ping", payload)` serializes `payload` to JSON, calls the native method named `ping`, and deserializes its result. Any shared logic that should run on both desktop and mobile can be written in `lib.rs` as methods on the plugin struct, as the mobile guide shows.

### 3.1 The Android plugin class (Kotlin)

The mobile guide states that an Android plugin is "a Kotlin class that extends `app.tauri.plugin.Plugin` and is annotated with `app.tauri.annotation.TauriPlugin`", and that each method annotated with `app.tauri.annotation.Command` can be called by Rust or JavaScript. The generated class is:

```kotlin
// android/src/main/java/ExamplePlugin.kt (generated)
package com.plugin.demo_camera

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@InvokeArg
class PingArgs {
  var value: String? = null
}

@TauriPlugin
class ExamplePlugin(private val activity: Activity): Plugin(activity) {
    private val implementation = Example()

    @Command
    fun ping(invoke: Invoke) {
        val args = invoke.parseArgs(PingArgs::class.java)
        val ret = JSObject()
        ret.put("value", implementation.pong(args.value ?: "default value :("))
        invoke.resolve(ret)
    }
}
```

The guide's rules for Android arguments and threads are listed below.

- Argument classes carry `@InvokeArg`, and so must any nested class. Optional arguments are `var name: Type? = null`; arguments with defaults are `var name: Type = value`; required arguments are `lateinit var name: Type`.
- A command finishes by calling `invoke.resolve(...)` with a `JSObject` result (the guide's examples use only `resolve`).
- Native commands run on the Android main thread, so long operations freeze the UI and can cause an "Application Not Responding" error. Run blocking work in a coroutine, for example `CoroutineScope(Dispatchers.IO).launch { val result = work(); invoke.resolve(result) }`. To call a Kotlin `suspend` function, create a custom coroutine scope (`CoroutineScope(Dispatchers.Default + SupervisorJob())`) and `launch` in it.
- Kotlin is the default; the guide says Android Studio's "Convert Kotlin file to Java file" can switch a plugin to Java.

### 3.2 The iOS plugin class (Swift)

The mobile guide states that an iOS plugin is "a Swift class that extends the `Plugin` class from the `Tauri` package", and that each function with the `@objc` attribute and an `(_ invoke: Invoke)` parameter can be called by Rust or JavaScript. The generated file is:

```swift
// ios/Sources/ExamplePlugin.swift (generated)
import SwiftRs
import Tauri
import UIKit
import WebKit

class PingArgs: Decodable {
  let value: String?
}

class ExamplePlugin: Plugin {
  @objc public func ping(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(PingArgs.self)
    invoke.resolve(["value": args.value ?? ""])
  }
}

@_cdecl("init_plugin_demo_camera")
public func initPlugin() -> Plugin {
  return ExamplePlugin()
}
```

The guide's rules for iOS arguments are listed below.

- Argument types inherit `Decodable`, and so must nested types. Optional arguments are `var name: Type?`; required ones are `let name: Type`.
- Default argument values are **not** supported on iOS; use an optional type and apply the default inside the function.
- The `@_cdecl("init_plugin_<name>")` function is the entry point Rust links against. The CLI changelog (PR #16246) says these entry points are now marked `public` in the templates "so release builds made with Xcode 27 keep them global and link"; keep the `public` keyword in plugins created from older templates.

### 3.3 Plugin configuration

An app configures a plugin under `plugins.<plugin-name>` in its `tauri.conf.json`, for example `"plugins": { "demo-camera": { "timeout": 30 } }`. On the Rust side the plugin declares a `Config` struct and builds with `Builder::<R, Config>::new("<plugin-name>")` (use `Option<Config>` to make it optional), reading it with `api.config()`. The native classes read the same configuration. Android uses `getConfig(Config::class.java)` with an `@InvokeArg class Config`, inside `load`. iOS uses `try parseConfig(Config.self)` with a `Decodable` struct, inside `load(webview:)`.

## 4. Commands, guest bindings and permissions

### 4.1 Commands

The plugin's web-facing commands live in `src/commands.rs` and are ordinary Tauri commands (see `05-ipc.md`) registered with `.invoke_handler(tauri::generate_handler![...])` on the plugin builder. The generated command delegates to the platform implementation through the extension trait:

```rust
// src/commands.rs (generated)
#[command]
pub(crate) async fn ping<R: Runtime>(app: AppHandle<R>, payload: PingRequest) -> Result<PingResponse> {
    app.demo_camera().ping(payload)
}
```

The extension trait (`DemoCameraExt`, with the method `demo_camera()`) is what the plugin guide calls "Exposing Rust APIs": the plugin struct is stored as managed state when the plugin is set up, and any `App`, `AppHandle` or `Window` can reach it through the trait. This lets the app's own Rust code call the plugin too.

### 4.2 Guest bindings

Plugin commands are called from JavaScript as `plugin:<plugin-name>|<command>`. The generated binding is:

```ts
// guest-js/index.ts (generated)
import { invoke } from '@tauri-apps/api/core'

export async function ping(value: string): Promise<string | null> {
  return await invoke<{ value?: string }>('plugin:demo-camera|ping', {
    payload: { value },
  }).then((r) => (r.value ? r.value : null));
}
```

The plugin guide's own example names the folder `webview-src/`, but the CLI template uses `guest-js/` (built to `dist-js/` by `rollup -c`). Build the TypeScript before testing it, as the guide says.

### 4.3 Permissions

The plugin guide states: "By default your commands are not accessible by the frontend." Each command needs a permission that allows it, and the app must grant that permission in a capability. The pieces are described below.

- **Autogenerated permissions.** In `build.rs`, the `COMMANDS` array lists command names in snake_case, and the build generates an `allow-<command>` and a `deny-<command>` permission for each. The generated `build.rs` also tells the build where the native projects are:

  ```rust
  // build.rs (generated)
  const COMMANDS: &[&str] = &["ping"];

  fn main() {
    tauri_plugin::Builder::new(COMMANDS)
      .android_path("android")
      .ios_path("ios")
      .build();
  }
  ```

- **Hand-written permissions** go in `permissions/*.toml` (or JSON) as `[[permission]]` entries with `identifier`, `description`, and `commands.allow` / `commands.deny`. A **permission set** (`[[set]]`) groups several permissions under one identifier.
- **The default set** has the identifier `default`. The guide recommends that it enable the commands the plugin needs to be useful. The generated one is:

  ```toml
  # permissions/default.toml (generated)
  [default]
  description = "Default permissions for the plugin"
  permissions = ["allow-ping"]
  ```

- **Scopes** narrow what a command may do (for example which binaries it may run). The plugin reads them with `tauri::ipc::CommandScope<'_, T>` (scope set per command in the app's capability) and `tauri::ipc::GlobalScope<'_, T>` (scope set by a permission that lists no commands). The scope entry type derives `schemars::JsonSchema`, and `build.rs` registers its schema with `.global_scope_schema(schemars::schema_for!(scope::Entry))`. The guide recommends checking both kinds of scope.

The app then grants the plugin's permissions, for example by adding `"demo-camera:default"` to the `permissions` array of a file in `src-tauri/capabilities/`.

### 4.4 Mobile runtime permissions (user consent)

Separately from Tauri's permission system, mobile operating systems ask the user before an app may use sensitive features. The mobile guide shows how a plugin declares and requests these. The platform-specific parts are listed below.

- **Android:** list the needed Android permissions and an alias for each group in the annotation, for example `@TauriPlugin(permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "postNotification")])`.
- **iOS:** override `checkPermissions(_ invoke:)` and `requestPermissions(_ invoke:)` and resolve each alias with a state such as `"prompt"` or `"granted"`.

Tauri then provides two commands for every such plugin, `checkPermissions` and `requestPermissions`, callable from JavaScript (`invoke('plugin:<plugin-name>|checkPermissions')`, and `invoke('plugin:<plugin-name>|requestPermissions', { permissions: ['postNotification'] })`) or from Rust (`run_mobile_plugin("checkPermissions", ())`). The states use the `PermissionState` type; the guide's example checks for `'prompt-with-rationale'` to explain to the user why the permission is needed before asking.

## 5. Lifecycle hooks and events

### 5.1 Rust lifecycle hooks (all platforms)

The plugin guide lists five hooks on the plugin `Builder`, summarized in the table below.

| Hook | When it runs | Typical use |
| --- | --- | --- |
| `setup(|app, api| ...)` | The plugin is initialized | Register the mobile plugin, manage state, start background tasks |
| `on_navigation(|window, url| ...)` | A web view is about to navigate | Validate or track URLs; returning `false` cancels the navigation |
| `on_webview_ready(|window| ...)` | A new window has been created | Run per-window initialization |
| `on_event(|app, event| ...)` | Event-loop events (`RunEvent`) | React to exit requests (`api.prevent_exit()`), save state on `RunEvent::Exit` |
| `on_drop(|app| ...)` | The plugin is destroyed | Cleanup |

### 5.2 Native lifecycle hooks (mobile)

The mobile guide adds two native hooks, described below.

- **`load`** runs when the plugin is loaded into the web view, on both platforms: `override fun load(webView: WebView)` in Kotlin, `@objc public override func load(webview: WKWebView)` in Swift. Use it for initialization and for reading configuration.
- **`onNewIntent`** (Android only) runs when the activity is re-launched, for example when the user taps a notification or opens a deep link: `override fun onNewIntent(intent: Intent)`.

### 5.3 Events from native code to JavaScript

Native code emits events with `trigger`: `trigger("camera", payload)` in Kotlin with a `JSObject`, `trigger("camera", data: ["open": true])` in Swift. The guest bindings subscribe with `addPluginListener` from `@tauri-apps/api/core`:

```ts
import { addPluginListener, PluginListener } from '@tauri-apps/api/core';

export async function onCamera(handler: (payload: unknown) => void): Promise<PluginListener> {
  return await addPluginListener('demo-camera', 'camera', handler);
}
```

The guide notes that listening to plugin events is gated by the same capability system as commands: the app must grant the plugin's permission (commonly `<plugin-name>:default`, or a specific `allow-listen-*` permission if the plugin defines one).

## 6. Calling native APIs and calling Rust from native code

Calling an Android or iOS API is ordinary Kotlin or Swift code inside a command method. The Android plugin class receives the app's `Activity` in its constructor, and the generated Swift file imports `UIKit` and `WebKit`, so platform APIs are reached as in other native code. Add Android library dependencies to the plugin's `android/build.gradle.kts` and Swift package dependencies to `ios/Package.swift`, as the guide notes the plugin "is defined as a Swift package so that you can use its package manager to manage dependencies".

The reverse direction, native code calling into Rust, is not provided by Tauri directly, but the mobile guide documents a pattern that works even while the web view is suspended. The two platforms are described below.

- **Android (JNI).** Add `jni = "0.21"` under `[target.'cfg(target_os = "android")'.dependencies]` in the plugin's `Cargo.toml`. In Kotlin, load the app's native library with `System.loadLibrary("app_lib")` (the guide explains it is the shared library built from `crate-type = ["cdylib"]`; the name must match the app's `[lib] name`) and declare `external fun helloWorld(name: String): String?`. In Rust, export a function named `Java_<package>_<class>_<method>`, for example `Java_com_example_HelloWorld_helloWorld`, marked `#[cfg(target_os = "android")]`, `#[no_mangle]` and `pub extern "system"`, taking `JNIEnv`, `JClass` and `JString`.
- **iOS (C FFI).** No extra crate is needed. In Swift, declare the Rust functions with `@_silgen_name("hello_world_ffi")`. In Rust, export matching `#[no_mangle] pub unsafe extern "C" fn hello_world_ffi(c_name: *const c_char) -> *mut c_char`, and also a function that frees the returned string (`CString::from_raw`), which Swift must call after copying the result.

The guide also notes, under "Android 16KB Memory Pages", that Google is moving to require 16 KB memory-page alignment for new Play submissions. Building with NDK 28 or newer should handle it automatically; with an older NDK, add the following to `.cargo/config.toml`:

```toml
[target.aarch64-linux-android]
rustflags = ["-C", "link-arg=-Wl,-z,max-page-size=16384"]
```

## 7. Using the plugin in an app

The plugin docs describe building plugins but do not give a step-by-step for consuming an unpublished, local plugin. The procedure below uses standard Cargo and package-manager features and is therefore **UNVERIFIED** against Tauri sources.

1. Add the crate as a path dependency in the app's `src-tauri/Cargo.toml`, for example `tauri-plugin-demo-camera = { path = "../plugins/tauri-plugin-demo-camera" }`.
2. Register it in `lib.rs`: `.plugin(tauri_plugin_demo_camera::init())`.
3. Grant `"demo-camera:default"` (or individual `demo-camera:allow-<command>` permissions) in a capability file.
4. Build the guest bindings (`bun run build` / `npm run build` in the plugin folder) and add the plugin folder as a dependency of the app's frontend (`bun add ./plugins/tauri-plugin-demo-camera` / `npm install ./plugins/tauri-plugin-demo-camera`), or call `invoke('plugin:demo-camera|ping', ...)` directly.
5. Run `bun run tauri android dev` or `bun run tauri ios dev`. The `.android_path("android")` / `.ios_path("ios")` calls in the plugin's `build.rs` are what make the native projects part of the app's mobile build; how the app's Gradle and Xcode projects pick them up is not described in the docs.

If the plugin is meant to work on only some platforms, declare that in its `Cargo.toml` with `[package.metadata.platforms.support]` (keys `windows`, `linux`, `macos`, `android`, `ios`, each with `level = "full" | "partial" | "none"` and optional `notes`). The plugin guide says this metadata drives the support table on the docs site; whether the CLI also reads it is not stated.

## Facts that could not be verified here

The items below are marked **UNVERIFIED** in the text or could not be run in this session, which had no Android SDK and no Mac.

- The consumption steps in section 7 (path dependency, local NPM install) and how Gradle/Xcode include a local plugin's native projects.
- No Kotlin or Swift code was compiled; all native examples are quoted from the docs or the generated template.
- `bunx @tauri-apps/cli plugin new ...` was not run (the project-local `tauri` binary was used).
