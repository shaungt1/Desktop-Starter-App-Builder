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

## Windows machines

**`doctor` says Node.js is "too old" but you installed a newer one.** A second,
older Node.js is earlier on the PATH than the one you expect. In Git Bash, `which -a node`
lists every copy in search order. If Node.js comes from a version manager such as
nvm-windows, switch with `nvm use 22.17.0` (or newer) instead of installing another copy, and
open a new terminal. The bootstrap script no longer puts `C:\Program Files\nodejs` ahead of
your own PATH, and prints the `nvm` commands when nvm-windows is installed.

**The bootstrap reports "winget (App Installer) was not found".** `winget.exe` lives in
`%LOCALAPPDATA%\Microsoft\WindowsApps`, which some shells do not have on the PATH. The script
searches that folder; if it still fails, run `winget --version` in PowerShell. If that also
fails, install "App Installer" from the Microsoft Store.

**`bun` is "command not found" in a terminal opened by an editor or agent.** The Bun installer
puts `bun.exe` in `~/.bun/bin`, and a terminal that started before the install does not see it.
Open a new terminal, or run `export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"` in Git Bash.

**Tauri end-to-end tests fail at session start with a driver version error.**
`msedgedriver.exe` must have the same major version as Microsoft Edge, and Edge updates itself.
Run `bash start.sh doctor --base tauri --e2e` to see both versions, then
`bash start.sh bootstrap --base tauri --e2e` to download the matching driver.

## Browser extensions

**`bun run test:e2e` cannot find the extension, or no service worker appears.** The tests load
`.output/chrome-mv3`, which `bun run build` creates; `test:e2e` builds first, so a failed build
is the usual cause. Read the build output above the test output. Google Chrome and Microsoft Edge
no longer allow loading an unpacked extension from the command line, which is why the tests use
the Chromium that Playwright downloads (`channel: "chromium"`), not your installed browser.

**Playwright prints missing shared libraries on Linux.** Install Chromium's system libraries:
`bunx playwright install --with-deps chromium`.

**Firefox rejects the add-on or warns about `data_collection_permissions`.** Firefox requires
new add-ons to declare what data they collect and a stable id. `wxt.config.ts` sets both for
Firefox builds (id `<slug>@<appId>`, data collection "none"); replace the id with one you own and
change the declaration if the extension sends user data anywhere.

**State disappears or a message gets no answer after a pause.** The browser stops the background
service worker when it is idle and starts it again for the next event. Variables are lost, and a
listener registered after an `await` is not there when the worker wakes. Keep state in
`src/lib/settings.ts` and register listeners synchronously at the top of `defineBackground`.

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
