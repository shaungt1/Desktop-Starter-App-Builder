# Troubleshooting

Each entry below gives the symptom as it appears, its cause, and the fix. The
entries were collected while building and testing this builder, so each one
has actually occurred.

## Builder

**`error: Target is not empty`.** `create` only fills a folder that is missing,
empty, or contains files a fresh repository has (`.git`, `README.md`,
`LICENSE`, `.gitignore`, `.gitattributes`). Choose a new folder, or for an app
the builder generated earlier use `module add`.

**`Module "x" requires moduleOptions.x.y`.** A selected module has a required
option. Run `bash start.sh module show x` and add the option to the plan, or
pass `--option y=value` to `module add`.

**PowerShell says running scripts is disabled.** Allow local scripts for your
user once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use Git Bash
with `bash start.sh`.

## Electron apps

**`bun install` prints "Blocked 1 postinstall".** Bun runs install scripts only
for packages listed under `trustedDependencies` in `package.json`. The template
trusts `electron` and `electron-winstaller` (used for Windows installers). If you
add a package that needs its script, add it there too.

**The packaged app fails with "DatabaseSync is not a constructor".** The main
bundle tried to bundle `node:sqlite`. `vite.main.config.mts` marks it external;
keep that line if you replace the file.

**Packaging fails with "The main entry point to your app was not found".**
Electron Forge's Vite plugin names each bundle after its entry file, so entries
must have distinct names (`src/main/main.ts` becomes `.vite/build/main.cjs`,
`src/preload/preload.ts` becomes `preload.cjs`). `package.json` `main` must
point to `.vite/build/main.cjs`.

**Packaging fails because Electron cannot be downloaded (behind a proxy).**
Electron's downloader may not use your proxy settings. Download the
`electron-v<version>-<platform>-<arch>.zip` release asset yourself and either
set `ELECTRON_OVERRIDE_DIST_PATH` to its unzipped folder for running, or place
the zip (with `SHASUMS256.txt`) in Electron's cache folder for packaging.

**The window is blank and the console shows a Content-Security-Policy error.**
`index.html` allows only the app's own scripts and styles. Add the specific
origin your app needs to the right directive (for example `connect-src` for an
API) rather than loosening `default-src`.

**`bun run make` fails on Linux with a fakeroot or dpkg error.** Install them:
`sudo apt install dpkg fakeroot`.

**End-to-end tests fail with "Target page, context or browser has been closed".**
The app exited during start-up. Run the packaged app from a terminal to see the
error: `./node_modules/.bin/electron out/<app>-<platform>-<arch>/resources/app.asar`.

## Tauri apps

**`cargo` fails in `tauri-plugin-deep-link` with "missing fields ... in initializer of ParseOption".**
A newer `rust-ini` patch release changed a public struct. The template's
`src-tauri/Cargo.lock` pins `rust-ini` 0.21.1; keep the lock file, or run
`cargo update -p rust-ini --precise 0.21.1` inside `src-tauri`.

**"the trait bound `AppHandle: CommandArg<'_, R>` is not satisfied".** A command
takes `AppHandle` without the runtime parameter. Commands are registered by a
generic handler, so write `fn name<R: Runtime>(app: AppHandle<R>)`.

**The app panics at start-up with "Error deserializing 'plugins.updater'".** The
updater plugin needs a `plugins.updater` section in `tauri.conf.json`. The
auto-update module adds an empty one; restore it if it was removed.

**A plugin call is rejected with "<plugin>.<command> not allowed".** The
permission is not granted. Add the exact permission the message names to a file
in `src-tauri/capabilities/` (for example `sql:allow-execute`).

**The build stops with "Permission <id> not found".** A capability file names a
permission that does not exist, usually a typo or a plugin that is not installed.

**Blank window during `bun run dev`.** Vite is not on the port in
`build.devUrl` (1420). Another process holds the port; stop it, since
`strictPort` prevents Vite from moving.

**Linux build fails looking for `webkit2gtk-4.1`.** Install the development
files listed in `docs/MANUAL_SETUP.md`. Tauri 2 needs WebKitGTK 4.1, which means
Ubuntu 22.04 or newer.

**Deep links do not open the app on Linux during development.** The scheme is
registered at run time on Windows and Linux, but some desktop environments
only honor schemes from installed `.desktop` files. Test sign-in with an
installed `.deb`, or on Windows or macOS.
