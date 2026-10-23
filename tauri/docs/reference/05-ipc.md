# Inter-Process Communication: Commands, Events, Channels, State

Source pages:
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/calling-rust.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/calling-frontend.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/_sections/frontend-listen.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/state-management.mdx

Verified on 2026-10-21

## Overview

The frontend (JavaScript in the web view) and the backend (Rust) communicate in three ways. **Commands** are type-safe request/response calls from the frontend into Rust. **Events** are untyped, fire-and-forget JSON messages that either side can emit and listen to. **Channels** are ordered, fast streams from Rust to the frontend, created by the frontend and passed into a command. Rust code also keeps long-lived data in **managed state**, which commands can read. The sections below cover each in that order.

## Commands

### Defining and registering

A command is a Rust function annotated with `#[tauri::command]`. All commands must be listed in **one** call to `tauri::generate_handler!` passed to `invoke_handler`; calling `invoke_handler` more than once keeps only the last call.

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn my_custom_command() {
    println!("I was invoked from JavaScript!");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![my_custom_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Rules from the docs:

- Command names must be unique across the whole app, including across modules.
- Commands defined directly in `lib.rs` must **not** be `pub`; doing so causes `error[E0255]: the name '__cmd__<name>' is defined multiple times`.
- Commands in a separate module must be `pub` and are registered with their path, for example `generate_handler![commands::my_custom_command]`; the frontend still calls `invoke("my_custom_command")` without the module prefix.

### Calling from the frontend

```ts
import { invoke } from '@tauri-apps/api/core';
await invoke('my_custom_command');
```

Without a bundler, set `app.withGlobalTauri: true` and use `window.__TAURI__.core.invoke`.

### Arguments

Arguments are passed as a JSON object whose keys are **camelCase** versions of the Rust parameter names. Each argument type must implement `serde::Deserialize`.

```rust
#[tauri::command]
fn my_custom_command(invoke_message: String) { /* ... */ }
```

```ts
invoke('my_custom_command', { invokeMessage: 'Hello!' });
```

To use snake_case keys instead, write `#[tauri::command(rename_all = "snake_case")]`.

### Return values

The return type must implement `serde::Serialize`; `invoke` resolves with the deserialized value. For large binary data, return `tauri::ipc::Response::new(bytes)` to avoid JSON serialization overhead.

### Errors

Return `Result<T, E>`. `Ok` resolves the promise; `Err` rejects it. The error type must also implement `serde::Serialize`, which most standard and third-party error types do not. The simple fix is `.map_err(|e| e.to_string())` with `Result<T, String>`. The docs recommend a custom error type built with the `thiserror` crate and a manual `Serialize` implementation:

```rust
#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command]
fn my_custom_command() -> Result<(), Error> {
    std::fs::File::open("path/that/does/not/exist")?;
    Ok(())
}
```

The docs also show a variant that serializes to `{ kind: 'io' | 'utf8', message: string }` by mapping each error variant into a tagged enum (`#[serde(tag = "kind", content = "message")]`, `#[serde(rename_all = "camelCase")]`), so the frontend can branch on `kind`. Using `thiserror` requires adding it to `Cargo.toml` (for example `cargo add thiserror`).

### Async commands

The docs prefer async commands for heavy work so the UI does not freeze. Async commands run on a separate task via `async_runtime::spawn`. Non-async commands run on the main thread unless declared `#[tauri::command(async)]`.

There is a borrowing limitation: an async command cannot simply take borrowed arguments such as `&str` or `State<'_, T>`. The two workarounds are:

1. Use owned types (for example `String` instead of `&str`).
2. Return a `Result<T, E>` (for example `Result<String, ()>`), which makes borrowed arguments allowed.

### Special parameters

A command can declare these extra parameters, which Tauri injects and which the frontend does not pass:

- `webview_window: tauri::WebviewWindow`: the window that made the call.
- `app_handle: tauri::AppHandle`: a handle to the application.
- `state: tauri::State<'_, T>`: managed state (see below).
- `request: tauri::ipc::Request`: the raw request, giving access to a raw body (`InvokeBody::Raw`) and headers. On the frontend this is called as `invoke('upload', new Uint8Array([...]), { headers: { Authorization: 'apikey' } })`.
- A `tauri::ipc::Channel<T>` argument (see Channels).

## Events

Events are a simpler, untyped mechanism. They are always asynchronous, cannot return values, carry JSON payloads only, and are not governed by the capability system's fine-grained controls. The docs say they suit small amounts of data and many-producer/many-consumer patterns, not low-latency or high-throughput use.

### Emitting from Rust

`AppHandle` and `WebviewWindow` implement the `Emitter` and `Listener` traits. The payload must implement `Serialize` and `Clone`.

```rust
use tauri::{AppHandle, Emitter};

#[tauri::command]
fn download(app: AppHandle, url: String) {
    app.emit("download-started", &url).unwrap();          // global: every listener
    app.emit_to("login", "login-result", "ok").unwrap();   // only the webview labelled "login"
}
```

`emit_filter` sends to a chosen set of targets, for example matching `EventTarget::WebviewWindow { label }`.

### Emitting from the frontend

```ts
import { emit, emitTo } from '@tauri-apps/api/event';
emit('file-selected', '/path/to/file');
emitTo('settings', 'settings-update-requested', { key: 'notification', value: 'all' });
```

### Listening on the frontend

```ts
import { listen } from '@tauri-apps/api/event';

type DownloadStarted = { url: string; downloadId: number; contentLength: number };

const unlisten = await listen<DownloadStarted>('download-started', (event) => {
  console.log(event.payload.url);
});
// later, for example when a component unmounts:
unlisten();
```

Points the docs emphasize:

- `listen` returns a **Promise** of the unlisten function. Await it before calling it; calling it immediately on the unresolved promise does nothing.
- Always unlisten when the component or context goes away. Page reloads clear listeners automatically, but single-page-app route changes do not.
- Events sent to a specific webview are not delivered to ordinary global listeners. To catch everything, pass `{ target: { kind: 'Any' } }` to `listen` on the frontend, or use `listen_any` in Rust.
- For a listener scoped to the current window, use `getCurrentWebviewWindow().listen(...)` from `@tauri-apps/api/webviewWindow`.

## Channels

Channels are the recommended way to stream data (progress, chunks, child-process output) from Rust to the frontend. They are ordered and faster than events. The frontend creates a `Channel`, passes it as a command argument, and Rust calls `send` on it.

```rust
use tauri::{AppHandle, ipc::Channel};
use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "event", content = "data")]
enum DownloadEvent<'a> {
    Started { url: &'a str, download_id: usize, content_length: usize },
    Progress { download_id: usize, chunk_length: usize },
    Finished { download_id: usize },
}

#[tauri::command]
fn download(app: AppHandle, url: String, on_event: Channel<DownloadEvent>) {
    on_event.send(DownloadEvent::Started { url: &url, download_id: 1, content_length: 1000 }).unwrap();
    on_event.send(DownloadEvent::Finished { download_id: 1 }).unwrap();
}
```

```ts
import { invoke, Channel } from '@tauri-apps/api/core';

const onEvent = new Channel<{ event: string; data: unknown }>();
onEvent.onmessage = (message) => console.log(message.event);
await invoke('download', { url: 'https://example.com/file', onEvent });
```

Note that the Rust parameter `on_event` becomes the camelCase key `onEvent` on the frontend.

## Evaluating JavaScript from Rust

`WebviewWindow::eval` runs a JavaScript string in a window, for example inside `setup`:

```rust
use tauri::Manager;
tauri::Builder::default().setup(|app| {
    let webview = app.get_webview_window("main").unwrap();
    webview.eval("console.log('hello from Rust')")?;
    Ok(())
});
```

For scripts built from Rust data the docs suggest the `serialize-to-javascript` crate.

## Managed state

### Registering state

State is registered with `manage`, either on the builder or on the app inside `setup`. Each managed type is stored once and looked up by type.

```rust
use std::sync::Mutex;
use tauri::{Builder, Manager};

#[derive(Default)]
struct AppState { counter: u32 }

Builder::default()
    .setup(|app| {
        app.manage(Mutex::new(AppState::default()));
        Ok(())
    })
```

Because state is shared across threads, mutable data needs interior mutability, usually `std::sync::Mutex`. The docs quote Tokio's guidance that the standard `Mutex` is usually fine even in async code; an async mutex is only needed when the guard must be held across `.await`. `Arc` is not needed because Tauri already shares the state.

### Using state in commands

```rust
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
fn increase_counter(state: State<'_, Mutex<AppState>>) -> u32 {
    let mut state = state.lock().unwrap();
    state.counter += 1;
    state.counter
}
```

An async command taking `State` must return a `Result` because `State<'_, T>` is borrowed:

```rust
#[tauri::command]
async fn increase_counter(state: State<'_, Mutex<AppState>>) -> Result<u32, ()> {
    let mut state = state.lock().unwrap(); // or `.lock().await` with tokio::sync::Mutex
    state.counter += 1;
    Ok(state.counter)
}
```

### Using state outside commands

Anything implementing the `Manager` trait (the `App`, an `AppHandle`, a `Window`) has `state::<T>()`. For example inside `on_window_event`, call `window.app_handle().state::<Mutex<AppState>>()`. To use state on another thread, move an `AppHandle` into the thread and fetch the state from it.

### Type mismatch pitfall

Asking for the wrong type compiles fine but fails at call time: the frontend's `invoke` rejects with a "state not managed" error. A typical mistake is requesting `State<'_, AppState>` when `Mutex<AppState>` was managed. A type alias such as `type AppState = Mutex<AppStateInner>;` avoids this, as long as it is not wrapped in a second `Mutex`.

## Tested example

The following combination was compiled with `cargo check` in a generated project with no errors **(tested)**: a sync command, a command using `State<'_, Mutex<Counter>>` registered with `.manage(Mutex::new(Counter::default()))`, and an async command `read_len(path: String) -> Result<usize, Error>` using a `thiserror` error type with a manual `Serialize` implementation, all registered in one `generate_handler![greet, increment, read_len]`.
