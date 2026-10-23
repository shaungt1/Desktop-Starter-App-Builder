# Testing

Testing happens at two levels: the builder's own tests, which prove the
generator produces correct apps, and each generated app's tests, which prove
the app works. This document describes both, what each test covers and what it
needs to run.

## Builder tests

The builder's tests run with Bun from the builder root.

| Command | What it checks | Time |
| --- | --- | --- |
| `bun run verify` | Type check, Biome lint and format, and the unit tests below. | Seconds |
| `bun run test` | Unit tests only. | Seconds |
| `bun run test:generate` | Creates real apps from every example plan, installs packages and runs each app's `verify`. | Minutes (Tauri compiles Rust) |
| `DSAB_E2E=1 bun run test:generate` | The same, plus each app's end-to-end tests. | Longer; needs a display or `xvfb-run` |

The unit tests cover plan validation (every rejected input has a test), module
dependency resolution, registry and Cargo composition, the catalog-to-disk
consistency check, and a generation dry run of every example plan that also
asserts no `__TOKEN__` placeholder survives. `DSAB_PLANS=electron-full,tauri-full,extension-full`
limits the generation test to named examples, and `DSAB_KEEP=1` keeps the
generated apps for inspection.

## Tests inside a generated Electron app

| Command | What it checks |
| --- | --- |
| `bun run verify` | `tsc` type check, Biome lint and format, Vitest unit tests. Main-process logic (security rules, database migrations, secret store, sign-in PKCE and token validation, path grants) runs in Node; interface components run in a simulated browser (jsdom). |
| `bun run test:e2e` | Packages the app with Electron Forge, then Playwright launches the packaged archive and checks the window loads and reaches the main process over IPC. Modules add their own end-to-end tests (for example creating and deleting a note, and checking the background worker reports heartbeats). |

On a Linux machine without a display, prefix the end-to-end command with
`xvfb-run -a`. When running as the root user (containers, some CI images) the
tests pass `--no-sandbox` to Chromium automatically.

## Tests inside a generated Tauri app

| Command | What it checks |
| --- | --- |
| `bun run verify` | `tsc`, Biome, Vitest interface tests with Tauri's IPC mocked by `@tauri-apps/api/mocks`, and `cargo test` for the Rust core (configuration parsing, link validation, migration ordering, PKCE and ID-token validation, path grants, secret key validation). |
| `bun run test:e2e` | Builds a debug binary and drives it through WebDriver using `tauri-driver` and WebdriverIO. |

Tauri end-to-end tests need `tauri-driver` (`cargo install tauri-driver --locked`).
Linux also needs `webkit2gtk-driver` and, without a display, `xvfb-run -a`.
Windows needs an `msedgedriver.exe` that matches the installed Edge version.
macOS has no WebDriver for its web view; the WebdriverIO Tauri service with its
embedded driver is the documented alternative there, described in
`tauri/docs/reference/08-testing-debugging.md`.

## Tests inside a generated browser extension

| Command | What it checks |
| --- | --- |
| `bun run verify` | `tsc`, Biome, and Vitest unit tests. The WXT Vitest plugin gives the tests an in-memory copy of the browser extension APIs (`fakeBrowser`), so message validation, storage and module logic run in Node; React screens run in jsdom. |
| `bun run test:e2e` | Builds the extension, then Playwright loads `.output/chrome-mv3` into Chromium (a persistent context with `channel: "chromium"`, which runs headless) and drives the popup, the options page and a content script on a locally answered `https://example.com/` page. |

The first `test:e2e` run downloads Playwright's Chromium (about 200 MB). Linux CI
also needs Chromium's system libraries: `bunx playwright install --with-deps chromium`.
Store review and real sign-in flows cannot be automated.

## What was verified, and where

The results below are the runs that were actually executed. Anything not listed
here was not run, and `GAP_ANALYSIS.md` lists those gaps.

**Windows 11, Git Bash** (Bun 1.4.4, Node.js 22.18, Rust 1.99.1 with the MSVC
toolchain, Microsoft Edge 156 with a matching `msedgedriver`, `tauri-driver` 2.1.0):

1. Builder `bun run verify`: type check, lint, 95 unit tests (including a
   generation dry run of every example plan).
2. All 11 desktop example plans (`electron-native`, `electron-remote`,
   `electron-exported`, `electron-full`, `electron-nextjs`, `electron-konsta-npm`,
   `tauri-native`, `tauri-remote`, `tauri-full`, `tauri-nextjs-konsta`,
   `tauri-mobile`) were generated, installed, verified and end-to-end tested
   (Electron through Playwright on the packaged app, Tauri through `tauri-driver`
   and `msedgedriver`). For `tauri-mobile` this is the desktop build only.
3. Browser extensions: `extension-basic` and `extension-full` were generated,
   installed, verified (11 and 15 unit tests), built for Chrome and Firefox,
   zipped for the stores, and end-to-end tested in Chromium (3 tests, and 5 with
   all modules). An npm variant passed `verify`. `module add` was run on an
   existing extension (side panel, then page overlay) and its tests passed.
4. Installers: Electron `make` produced a Squirrel `Setup.exe` (about 155 MB,
   unsigned); Tauri `build:app` produced an MSI and an NSIS installer (about 2 MB
   and 1.4 MB, unsigned). The installers were built, not installed or launched.
5. Scripts: `bootstrap.sh` really installed `tauri-driver` and the matching
   `msedgedriver`; `bootstrap.ps1` ran dry runs under Windows PowerShell 5.1 and
   its Edge driver download ran into a temporary folder.

**Linux in Docker** (the image built from `docker/Dockerfile`, Debian 12):
`doctor --base tauri --e2e` passed, and the `extension-full`, `electron-native`
and `tauri-native` plans were generated, installed, verified and end-to-end
tested inside the container. The image was also built with the Android layer
(`WITH_ANDROID=true`), which checks the SDK download address, its SHA-256 and
the pinned platform, build-tools and NDK versions; in it, the `tauri-mobile` plan
passed `verify`, `android:init` and `android:build` (an unsigned universal APK and
an AAB for all four Android targets). It was not run on an emulator or device.

**Ubuntu 24.04 (an earlier session)**: every desktop example plan was generated,
installed, verified and end-to-end tested under `xvfb-run`; Electron `make` made a
`.deb` and a `.zip`, and a Tauri release build made a `.deb`.

**Not run anywhere**: macOS; iOS; an Android emulator or device; installing or launching the built installers;
code signing and notarization; any GitHub Actions workflow; any store
submission; Tauri end-to-end tests on macOS.
