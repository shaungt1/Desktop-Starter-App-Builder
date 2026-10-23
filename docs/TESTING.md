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
asserts no `__TOKEN__` placeholder survives. `DSAB_PLANS=electron-full,tauri-full`
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

## What was verified when this builder was assembled

On Ubuntu 24.04 with Bun 1.4, Node 22, Rust 1.97, Electron 45.0.0 and Tauri
2.12, the following passed:

1. Builder `bun run verify`.
2. Electron, native profile with every module: `verify` (13 unit tests),
   packaged end-to-end tests (app, database and background worker) and
   `bun run make` producing a `.deb` and a `.zip`.
3. Electron, remote profile (offline fallback) and exported profile (static
   export served over `app://`): `verify` and packaged end-to-end tests.
4. Tauri, native profile with every module: `verify` (interface tests and 8 Rust
   tests), debug build, launch, and WebDriver end-to-end tests (app and database).
5. Tauri, remote profile: `verify`.
6. `module add` on an existing Electron app (sign-in, which brought in secure
   storage automatically) and an existing Tauri app (database).

Windows and macOS builds were not executed in that environment. The
`ci.yml` workflow in `.github/workflows` runs the generation tests on Linux,
Windows and macOS runners so those platforms are checked on every change.
