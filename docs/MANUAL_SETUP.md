# Manual setup

> [`REQUIREMENTS.md`](REQUIREMENTS.md) is the short checklist of tools per base with install commands, and [`SETUP_RESOURCES.md`](SETUP_RESOURCES.md) is the complete, per-operating-system list of tools with verified install commands and the mobile (Android, iOS) tooling; `scripts/bootstrap.sh` (Windows in Git Bash, macOS, Linux) and `scripts/bootstrap.ps1` automate it. This page summarizes the same setup.

This guide prepares a machine to generate, run and package apps with Desktop
Starter App Builder, without an AI agent. It is organized by operating system
and then by base, because Electron, Tauri and browser extensions need different tools. After the
tools are installed, `bash start.sh doctor --base <electron|tauri|extension>` confirms
that nothing is missing.

## Tools every app needs

Bun installs packages and runs every script in the builder and in generated
apps. Git provides version control and is used by `create` to initialize the
app's repository.

| Tool | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Bun 1.3+ | `powershell -c "irm bun.sh/install.ps1\|iex"` | `curl -fsSL https://bun.com/install \| bash` | `curl -fsSL https://bun.com/install \| bash` (needs `unzip`) |
| Git | `winget install Git.Git` (includes Git Bash) | `xcode-select --install` | `sudo apt install git` |

Bun's installation page is https://bun.sh/docs/installation. Open a new
terminal after installing so `bun` is on the `PATH`.

## Additional tools for browser extensions

A browser extension is built with WXT, which runs on Node.js, so it needs
**Node.js 22.17 or newer** and nothing else: no compiler, no installer tools and no
signing certificate. The end-to-end tests download their own Chromium the first
time they run (about 200 MB). To try the extension by hand you also need Chrome,
Edge or Firefox.

## Additional tools for Electron apps

Electron Forge's command-line tool runs on Node.js, so Electron apps also need
**Node.js 22.17 or newer**. Building Linux installers needs `dpkg` and
`fakeroot` (`sudo apt install dpkg fakeroot`). Building a Windows installer
must happen on Windows, and a macOS DMG on macOS. Nothing else is required: the
Electron runtime is downloaded the first time the app runs.

## Additional tools for Tauri apps

Tauri compiles a Rust program and links it against the operating system's web
view, so it needs the Rust toolchain and platform build tools.

1. **Rust** (stable 1.90 or newer) through rustup (https://rustup.rs). On macOS
   and Linux run `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.
   On Windows run `rustup-init.exe` and keep the default MSVC toolchain.
2. **Windows:** Visual Studio Build Tools with the "Desktop development with
   C++" workload, and the WebView2 runtime (already present on Windows 10 1803+
   and Windows 11).
3. **macOS:** Xcode Command Line Tools (`xcode-select --install`), macOS 10.15 or newer.
4. **Linux (Debian/Ubuntu 22.04 or newer):**
   `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`.
   Other distributions are covered in `tauri/docs/reference/01-prerequisites.md`.

For Tauri end-to-end tests also install `tauri-driver`
(`cargo install tauri-driver --locked`) and, on Linux, `webkit2gtk-driver`
and `xvfb`; on Windows, an `msedgedriver.exe` matching the installed Edge
version on the `PATH` (`bash start.sh bootstrap --base tauri --e2e` downloads the
matching one from Microsoft for you).

## Windows notes

Use **Git Bash** (installed with Git) to run `bash start.sh ...`, or PowerShell
with `.\start.ps1 ...`. If PowerShell refuses to run the script, allow local
scripts for your user once with
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Keep generated apps on
a local drive rather than a synced folder, because synchronization tools can
lock files while packages install.

## Generating an app by hand

With the tools installed, follow [`QUICKSTART.md`](../QUICKSTART.md):
check the host, copy and edit a plan from `plans/examples/`, run
`bash start.sh create <target> --plan <plan> --install --verify`, then
`bun run dev` inside the app.

## Doing what the generator does, step by step

If you prefer to understand or reproduce the generator's work without running
it, these are the equivalent manual steps. They are also useful when adapting
an existing app to the same structure.

1. Copy `electron/template`, `tauri/template` or `extension/template` to the new folder.
2. Copy `shared/renderer` into `src/renderer` (Electron) or `src` (Tauri). Browser extensions have their own interface in the template and skip this step.
3. For a non-default profile, copy `electron/profiles/<profile>` (or
   `tauri/profiles/<profile>`) over it, replacing files.
4. For each module, copy `electron/modules/<id>`, `tauri/modules/<id>` or `extension/modules/<id>` into
   the app, add the packages listed for it in `docs/MODULES.md` to
   `package.json`, and for Tauri add its crates to `src-tauri/Cargo.toml`.
5. Edit the registry files described in `docs/ARCHITECTURE.md` to import each
   module.
6. Write `app.config.json` with the app's name, identifier, scheme, version,
   profile, remote URL, allowed origins, repository, modules and module options.
7. Replace every `__APP_NAME__`, `__APP_SLUG__`, `__APP_ID__`, `__APP_SCHEME__`,
   `__APP_DESCRIPTION__`, `__APP_AUTHOR__`, `__APP_VERSION__` and `__THEME_*__`
   placeholder.
8. Run `git init -b main`, `bun install` and `bun run verify`.

The generator does exactly this, validates every value and records what it did
in `.desktop-starter.json`, which is why using it is recommended.
