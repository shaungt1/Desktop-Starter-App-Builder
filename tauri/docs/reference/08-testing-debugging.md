# Testing and Debugging

Source pages:
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/Tests/index.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/Tests/mocking.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/Tests/WebDriver/index.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/Tests/WebDriver/manual-setup.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/Tests/WebDriver/ci.md
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/develop/Debug/index.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/plugin/logging.mdx
- https://github.com/tauri-apps/tauri/blob/8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f/crates/tauri/Cargo.toml (feature list)

Verified on 2026-10-21

## Testing levels at a glance

The docs describe three kinds of testing, from fastest to most complete. Frontend unit tests run in a normal JavaScript test runner with Tauri's IPC replaced by mocks. Rust tests run with `cargo test`, optionally using Tauri's mock runtime, in which no real web view is started. End-to-end tests drive the real built app through the WebDriver protocol. Each is covered below, followed by debugging tools.

## Frontend unit tests: mocking IPC

The `@tauri-apps/api/mocks` module lets frontend tests run without a Tauri backend. The examples in the docs use Vitest, but any runner works. Always call `clearMocks()` after each test so mock state does not leak between tests.

### Mocking commands

`mockIPC(handler)` intercepts every `invoke`. The handler receives the command name and arguments and returns the fake result.

```ts
import { beforeAll, expect, test, vi } from 'vitest';
import { randomFillSync } from 'crypto';
import { mockIPC } from '@tauri-apps/api/mocks';
import { invoke } from '@tauri-apps/api/core';

// jsdom has no WebCrypto, which the IPC layer needs
beforeAll(() => {
  Object.defineProperty(window, 'crypto', {
    value: { getRandomValues: (buffer) => randomFillSync(buffer) },
  });
});

test('invoke', async () => {
  mockIPC((cmd, args) => {
    if (cmd === 'add') return (args.a as number) + (args.b as number);
  });
  const spy = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke');
  expect(invoke('add', { a: 12, b: 15 })).resolves.toBe(27);
  expect(spy).toHaveBeenCalled();
});
```

To fake a shell or sidecar process, the handler looks for `args.message.cmd === 'execute'`, finds the event callback via `window['_' + args.message.onEventFn]`, and calls it with `{ event: 'Stdout', payload: ... }` one or more times and finally `{ event: 'Terminated', payload: { code: 0, signal: ... } }` to resolve the promise.

### Mocking events

Since `@tauri-apps/api` 2.7.0, passing `{ shouldMockEvents: true }` to `mockIPC` makes `emit` and `listen` work in tests:

```ts
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { emit, listen } from '@tauri-apps/api/event';

mockIPC(() => {}, { shouldMockEvents: true });
const handler = vi.fn();
listen('test-event', handler);
emit('test-event', { foo: 'bar' });
// handler called with { event: 'test-event', payload: { foo: 'bar' } }
```

`emitTo` and `emit_filter` are not supported by the mock.

### Mocking windows

`mockWindows('main', 'second', 'third')` fakes window labels; the first is treated as the current window. It does not fake window properties; intercept those calls with `mockIPC`.

## Rust tests

The docs' testing overview says Tauri supports unit and integration testing with a **mock runtime**, under which no native web view runs. The `tauri` crate has a `test` Cargo feature (seen in `crates/tauri/Cargo.toml`), and the IPC page mentions writing commands generic over `R: Runtime` so they can run on `tauri::test::MockRuntime`. The WebDriver CI example runs plain `cargo test` (in `src-tauri`) before the end-to-end suite. A step-by-step mock-runtime guide was not found in the docs source at this commit, so the exact test setup (for example helper functions in `tauri::test`) is **UNVERIFIED** here; consult the `tauri::test` module on docs.rs.

```sh
cd src-tauri
cargo test
```

## End-to-end tests with WebDriver

WebDriver is a W3C standard protocol for automating a browser or web view. The docs now recommend **WebdriverIO** with the `@wdio/tauri-service`, which works on Windows, Linux and macOS. By default the service runs an embedded WebDriver server inside the app (through the `tauri-plugin-wdio-webdriver` plugin), so no external driver is needed; this is how macOS is supported. The optional `tauri-plugin-wdio` plugin adds backend access (`browser.tauri.execute()`, IPC mocking with `browser.tauri.mock()`, log capture). Scaffold with:

```sh
npm create wdio@latest ./
```

then choose "Desktop Testing" and "Tauri". Minimal config from the docs:

```ts
export const config: WebdriverIO.Config = {
  services: [['tauri', { appBinaryPath: './src-tauri/target/release/my-tauri-app', driverProvider: 'embedded' }]],
};
```

There is also a "browser mode" that tests the frontend in Chrome against the Vite dev server, intercepting `invoke`, without building the Tauri binary.

### Driving `tauri-driver` directly

`tauri-driver` is Tauri's WebDriver proxy to the platform's native driver. Driven directly it supports **Windows and Linux only** on desktop (macOS has no WKWebView driver).

```sh
cargo install tauri-driver --locked
```

- **Linux** needs `WebKitWebDriver` (check with `which WebKitWebDriver`); on Debian-based systems it is in the `webkit2gtk-driver` package.
- **Windows** needs `msedgedriver.exe` matching the installed Edge version, on `PATH` or passed with `--native-driver`. A version mismatch can make tests hang. The docs suggest `cargo install --git https://github.com/chippers/msedgedriver-tool` and running `msedgedriver-tool.exe` to download the right one.

A complete minimal example project is referenced at https://github.com/tauri-apps/webdriver-example (not opened here).

### WebDriver in CI

The docs' GitHub Actions example runs on `ubuntu-latest` and `windows-latest`. On Linux it installs `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev webkit2gtk-driver xvfb`, runs `cargo test`, installs `tauri-driver`, and runs the WebdriverIO suite under `xvfb-run` (a virtual display, so the app can run headless). On Windows it installs the matching Edge driver with `msedgedriver-tool` and runs the suite directly.

## Debugging

### Dev-only code

Rust code can branch on how it was built:

- `#[cfg(dev)]` / `cfg!(dev)` / `tauri::is_dev()`: true when started by `tauri dev`.
- `#[cfg(debug_assertions)]` / `cfg!(debug_assertions)`: true for `tauri dev` and `tauri build --debug`.

### Rust console and backtraces

Rust `println!` output and panics appear in the terminal that ran `tauri dev`. For a stack trace:

```sh
RUST_BACKTRACE=1 bun run tauri dev
```

(PowerShell: `$env:RUST_BACKTRACE=1` first.) A built app can also be run from a terminal (`src-tauri/target/release/<app>` or `target/debug/<app>`) to see its output.

### Web view devtools

Right-click and choose "Inspect Element", or press `Ctrl+Shift+I` (Linux/Windows) / `Cmd+Option+I` (macOS). The inspector is WebKitGTK's on Linux, Safari's on macOS and Edge DevTools on Windows. Devtools are enabled in development and debug builds only. Options for other builds:

- `bun run tauri build --debug` produces a bundle under `src-tauri/target/debug/bundle` with devtools enabled.
- Enable the `devtools` Cargo feature on `tauri` for release builds. The docs warn that on macOS this uses a private API and the app will be rejected by the App Store.
- Open or close devtools from Rust with `window.open_devtools()` / `window.close_devtools()`, for example inside `setup` under `#[cfg(debug_assertions)]` after `app.get_webview_window("main")`.

The core Rust process can be debugged with GDB or LLDB; the docs have separate guides for VS Code, RustRover and Neovim, and mention CrabNebula DevTools.

### Logging with the log plugin

Add it with `bun run tauri add log` (the CLI registers `tauri_plugin_log::Builder::new().level(tauri_plugin_log::log::LevelFilter::Info).build()`). The default permission `log:default` grants `allow-log`. Behaviour from the logging page:

- By default it logs to stdout and to a file in the app's log directory. `clear_targets()` removes the defaults; add specific targets with `.target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout))` (also `Stderr`, a log directory, or the web view).
- From JavaScript: `import { trace, debug, info, warn, error, attachConsole, attachLogger } from '@tauri-apps/plugin-log'`. The docs show how to forward `console.*` calls to these functions.
- From Rust: use the `log` crate (`log = "0.4"` in `Cargo.toml`), for example `log::info!("...")`.
