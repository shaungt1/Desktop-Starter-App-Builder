# Architecture and project files

Source pages:
- electron/electron docs folder, commit `c80c71c7c6b1` (2026-10-22): `docs/tutorial/process-model.md`, `docs/tutorial/context-isolation.md`, `docs/tutorial/sandbox.md`, `docs/tutorial/fuses.md`, `docs/tutorial/asar-archives.md`, `docs/tutorial/asar-integrity.md`, `docs/tutorial/security.md` (section 18), `docs/api/protocol.md`
- electron-forge/electron-forge-docs, commit `494fe76a3943` (2026-10-21): `config/plugins/vite.md`, `config/plugins/fuses.md`, `config/plugins/auto-unpack-natives.md`
- The Electron template in this repository: `electron/template/` (every file listed below), `electron/profiles/remote/`, `electron/profiles/exported/` and `shared/renderer/`, read at repository commit `2d7931e126ed` plus uncommitted work in progress on 2026-10-22
- `npm view electron version` (45.0.0) and the installed `electron` package's type definitions (45.0.0)

Verified on 2026-10-22

This file explains how an Electron app is divided into processes, which security switches the generated template turns on, and what every file in a generated Electron app does. It extends `electron/docs/AGENT_REFERENCE.md`, which gives step-by-step recipes; read this file when you need to know *why* the code is arranged the way it is, or which file owns a behaviour.

## 1. Terms used in this file

The terms below are used throughout the set; each is defined once here in plain language.

- **Electron**: a framework that builds desktop applications from the Chromium browser engine (which draws web pages) and the Node.js runtime (which runs JavaScript with operating-system access). The generated template pins Electron **45.0.0**, which is also the current npm version.
- **Process**: a separately running program with its own memory. Electron apps always run several.
- **IPC (inter-process communication)**: messages passed between processes.
- **Electron Forge** ("Forge"): Electron's official build tool. It packages the app, turns the package into installers ("makers") and uploads them ("publishers"). The template uses Forge 8.0.1.
- **Vite**: a JavaScript bundler and development server. Forge's Vite plugin compiles the app's TypeScript with it.
- **ASAR**: Electron's archive format. The app's code is packed into one file, `app.asar`.
- **Fuse**: a switch stored inside the Electron executable that is flipped at packaging time to turn an Electron feature on or off.

## 2. The four kinds of process

Electron inherits Chromium's multi-process design: one privileged process controls the application and separate, less-privileged processes draw each page (`process-model.md`). The list below names each kind of process, what the Electron documentation says about it and where its code lives in the template.

1. **Main process.** There is exactly one. It is the app's entry point, runs in a full Node.js environment, creates windows with `BrowserWindow` and controls the app's lifecycle through the `app` module. In the template this is everything under `src/main/`, bundled to `.vite/build/main.cjs` (the `main` field of `package.json`).
2. **Renderer process.** Electron starts one for each open `BrowserWindow`. It draws web content and "should behave according to web standards"; it has no direct access to `require` or Node.js APIs. In the template this is the React interface under `src/renderer/`.
3. **Preload script.** Code that runs inside the renderer process *before* the page loads, with access to a limited set of Electron modules. In the template this is `src/preload/preload.ts`.
4. **Utility process.** A child process started from the main process with the `utilityProcess` API. It runs Node.js and can talk to renderers over `MessagePort` objects. The Electron documentation recommends it over Node's `child_process.fork`. The template bundles each file in `src/main/workers/` into its own `.cjs` file for this purpose (see `forge.config.ts`).

## 3. Isolation and sandboxing

Three settings decide how much power a page has. The template sets all three on the main window in `src/main/window.ts` (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`), and `AGENTS.md` forbids weakening them without the user's explicit request.

**Context isolation** runs the preload script and Electron's internal code in a separate JavaScript context from the page, so that `window.x = ...` in the preload script is invisible to the page. It has been the default since Electron 12 and the documentation recommends it "for all applications" (`context-isolation.md`). The usual way to give the page an API is `contextBridge.exposeInMainWorld`; the template deliberately exposes nothing through it (section 6.3 explains what it does instead).

**The sandbox** limits a process to CPU and memory; privileged work must be delegated over IPC. Renderers have been sandboxed by default since Electron 20, and setting `nodeIntegration: true` disables the sandbox (`sandbox.md`). A sandboxed preload script gets a `require` that can only load `electron` (giving `contextBridge`, `crashReporter`, `ipcRenderer`, `nativeImage`, `webFrame` and `webUtils`), a reduced `process` object, and no Node.js built-in modules such as `fs` or `Buffer`. This is why `vite.preload.config.mts` notes that the preload "may only import electron".

**Node integration** gives a renderer a full Node.js environment. It is off in the template.

## 4. Fuses

Fuses are bits in the Electron binary that are flipped at packaging time, before code signing, so that the operating system's signature check stops anyone flipping them back (`fuses.md`). Forge flips them with `@electron-forge/plugin-fuses`. The table below lists every fuse the template sets in `forge.config.ts`, Electron's default for it and what the template's value does.

| Fuse (`FuseV1Options.`) | Electron default | Template | Effect of the template's value |
| --- | --- | --- | --- |
| `RunAsNode` | Enabled | `false` | The `ELECTRON_RUN_AS_NODE` environment variable is ignored, so the app's binary cannot be used as a plain Node.js interpreter. `child_process.fork` throws; use `utilityProcess`. |
| `EnableCookieEncryption` | Disabled | `true` | Cookies on disk are encrypted with operating-system keys. One-way: turning it off later corrupts the cookie store. On macOS it needs a code-signed app. |
| `EnableNodeOptionsEnvironmentVariable` | Enabled | `false` | `NODE_OPTIONS` and `NODE_EXTRA_CA_CERTS` are ignored. |
| `EnableNodeCliInspectArguments` | Enabled | `false` | `--inspect` and similar debugger flags are ignored. |
| `EnableEmbeddedAsarIntegrityValidation` | Disabled | `true` | On macOS (Electron 16+) and Windows (Electron 30+), the contents of `app.asar` are checked against a hash at load time; a mismatch terminates the app. |
| `OnlyLoadAppFromAsar` | Disabled | `true` | Electron looks for the app only in `app.asar` (not an `app` folder or `default_app.asar`), so the integrity check cannot be bypassed. |

The template leaves the remaining fuses at their defaults. One of them matters for the next section: `GrantFileProtocolExtraPrivileges` is enabled by default and gives `file://` pages extra powers; the Electron documentation says to disable it "if you aren't serving pages from `file://`". The template's native profile *does* load its interface from `file://` (`src/main/local-renderer.ts`), so the fuse is left on.

Two consequences follow from the template's fuses. First, Playwright's documentation states that launching can time out when `EnableNodeCliInspectArguments` is `false`; this is why the end-to-end tests launch the packaged `app.asar` with the development Electron binary rather than the packaged executable (see `07-testing.md`). Second, the packaged app cannot be debugged with `--inspect`; debug with `bun run dev` instead.

To read the fuses of a built app, the Electron documentation gives this command (any operating system, with a path to the built app):

```bash
npx @electron/fuses read --app /Applications/Foo.app
```

## 5. ASAR and resource paths

Packaging puts the app's code into `resources/app.asar`, which avoids long-path problems on Windows and speeds up `require` (`asar-archives.md`). Node's `fs` and `require` read inside the archive as if it were a folder. The template sets `packagerConfig.asar: true` and adds `AutoUnpackNativesPlugin`, which moves native Node modules (compiled `.node` files) out of the archive into `app.asar.unpacked` (`auto-unpack-natives.md`).

Files that must stay outside the archive are listed in `packagerConfig.extraResource` and are copied next to `app.asar`. The template ships `assets/icon.png` this way, plus the `web-export/` folder in the exported profile. Code reads them through `resourcePath()` and `resourcesFolder()` in `src/main/resources.ts`, which return the project folder during `bun run dev` and the `resources` folder in a packaged app.

## 6. How the template is wired

This section follows one launch of a generated app, so that each file's job is seen in context.

### 6.1 Start-up

`src/main/main.ts` runs first. It quits immediately if `electron-squirrel-startup` reports a Windows installer event, sets the Windows App User Model ID, lets the profile register custom URL schemes (`registerContentSchemes()`, which must happen before the app is ready), calls each enabled module's `beforeReady`, and takes the single-instance lock so a second launch hands its arguments (for example a deep link) to the first. When Electron is ready it registers the deep-link scheme, applies the session security rules, starts each module, starts the IPC server and opens the main window.

### 6.2 What the window shows (profiles)

The template supports three *profiles*, chosen in the project plan and recorded in `app.config.json`. Each profile supplies its own `src/main/content.ts` with the same three functions (`registerContentSchemes`, `trustedOrigins`, `loadContent`), so the rest of the main process does not change. The list below describes them.

1. **Native** (default, `electron/template/src/main/content.ts`): loads the bundled React interface, from the Vite development server during `bun run dev` and from `.vite/renderer/main_window/index.html` on disk when packaged.
2. **Remote** (`electron/profiles/remote/src/main/content.ts`): loads the hosted web app at `remoteUrl`; navigation may stay on that origin and on `allowedOrigins`. If the site cannot load, the bundled offline screen (`#/offline`) is shown.
3. **Exported** (`electron/profiles/exported/src/main/content.ts`): serves a static web build, such as a Next.js static export, from `web-export/` through a privileged `app://` scheme. `06-nextjs-frontend.md` explains this profile in detail.

### 6.3 The IPC bridge

The renderer never receives `ipcRenderer`. Instead, `src/renderer/lib/ipc.ts` creates a `MessageChannel`, posts one port to its own window with the message `dsab:connect`, and builds a typed oRPC client on the other port. The preload script (`src/preload/preload.ts`) listens only for that message and forwards the port to the main process on the channel `dsab:ipc-port`. The main process (`src/main/ipc/server.ts`) checks the sending frame's URL with `isTrustedUrl()` and only then attaches the oRPC handler for the router in `src/main/ipc/router.ts`. Every procedure validates its input with Zod (`src/main/ipc/procedure.ts`). oRPC is a typed remote-procedure-call library; Zod is a schema-validation library.

### 6.4 Security rules

`src/main/security.ts` applies four rules to every window and session: page permission requests are denied unless named in `ALLOWED_PERMISSIONS` (only `clipboard-sanitized-write` by default); `window.open` never creates an Electron window and web links open in the system browser; navigation is allowed only to trusted origins and to `file:` and `app:` URLs; and `<webview>` tags are refused. `index.html` adds a Content Security Policy (a browser rule list of where scripts, styles and connections may come from).

## 7. Every file in a generated Electron app

The tables below list every file the builder copies from `electron/template/` (plus the files it adds from `shared/` and from the chosen profile) and say what each does. Files marked *generated* are rewritten by the builder's `module add` command; files marked *placeholder* contain `__UPPER_SNAKE__` tokens that the builder replaces with values from the plan.

**Note:** on 2026-10-22 the renderer folders were being reorganized in this repository (`src/renderer/pages/` renamed to `src/renderer/screens/`, and `app-layout.tsx` and the settings screen moved to `shared/renderer/`). The tables describe the state read on that date; check the folder listing of a generated app if a path differs.

### 7.1 Project root

The table below covers configuration files at the root of a generated app.

| File | Responsibility |
| --- | --- |
| `package.json` (*placeholder*) | Name, version and `main: ".vite/build/main.cjs"`; scripts `dev`, `package`, `make`, `publish`, `typecheck`, `lint`, `format`, `test`, `test:watch`, `test:e2e`, `verify`; pinned `electron` 45.0.0; `trustedDependencies: ["electron", "electron-winstaller"]` so Bun runs their install scripts. |
| `forge.config.ts` | Forge configuration: `packagerConfig` (name, `executableName`, `appBundleId`, icon, `asar`, deep-link `protocols`, `extraResource`, and `osxSign`/`osxNotarize` when `APPLE_SIGNING_IDENTITY` is set), makers (Squirrel, ZIP for macOS and Linux, DMG, deb), the GitHub publisher (draft releases, only when `repository` is set in the plan), and plugins (auto-unpack-natives, Vite with one build per worker file, Fuses). |
| `forge.env.d.ts` | Pulls in the type declarations of Forge's Vite plugin, which define `MAIN_WINDOW_VITE_DEV_SERVER_URL` and `MAIN_WINDOW_VITE_NAME`. |
| `vite.main.config.mts` | Vite settings for the main process (and workers): the `@main` alias, and `node:sqlite` kept external. |
| `vite.preload.config.mts` | Vite settings for the preload bundle (empty; the preload may only import `electron`). |
| `vite.renderer.config.mts` | Vite settings for the interface: React and Tailwind CSS plugins, the `@` alias to `src/renderer`. |
| `vitest.config.mts` | Unit-test runner settings: `*.test.ts` in Node, `*.test.tsx` opting into jsdom; `electron` aliased to `tests/unit/electron-stub.ts`. |
| `playwright.config.ts` | End-to-end settings: tests in `tests/e2e`, 60-second timeout, one worker, one retry on CI. |
| `index.html` (*placeholder*) | The interface's HTML entry with its Content Security Policy and the `#root` element. |
| `tsconfig.json` | TypeScript strict mode, `noUncheckedIndexedAccess`, path aliases `@/*` and `@main/*`. |
| `biome.json` | Biome linter and formatter rules (2-space indent, 120-character lines); declares the two Vite globals. |
| `components.json` | Settings for the shadcn command-line tool (`bunx shadcn@latest add <name>`). |
| `bunfig.toml` | Sets Bun's `linker = "hoisted"`, because Electron packaging needs a flat `node_modules`. |
| `.env.example` | Lists build-time variables: `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `GITHUB_TOKEN`. |
| `.gitignore`, `.gitattributes`, `.editorconfig` | Ignore build output and `.env`; force LF line endings and mark icons binary; editor defaults. |
| `README.md`, `AGENTS.md` (*placeholder*) | Human guide and rules for AI coding agents. |
| `THIRD_PARTY_NOTICES.md` | Credits for adapted MIT-licensed projects. |
| `assets/icon.png`, `assets/icon.ico`, `assets/icon.icns` | App icons for Linux, Windows and macOS (replaced from `shared/icons/` or the plan). |
| `app.config.json`, `project-plan.json`, `.desktop-starter.json` | Written by the builder: non-secret runtime settings, the plan the app was built from, and the builder version with enabled modules. |

### 7.2 Main process (`src/main`)

The table below covers the main-process files.

| File | Responsibility |
| --- | --- |
| `main.ts` | Start-up sequence described in section 6.1; quit rules (`window-all-closed`, `before-quit` disposing modules). |
| `window.ts` | Creates the main window with secure `webPreferences`, restores and saves its size and position, hides instead of closing when `lifecycle.keepRunningInBackground` is true. |
| `content.ts` | What the window shows; replaced per profile (section 6.2). |
| `local-renderer.ts` | Loads the bundled interface at a hash route, from the Vite dev server or from disk. |
| `security.ts` / `security.test.ts` | Permission, navigation, new-window and `<webview>` rules, and their unit tests. |
| `deep-links.ts` | Registers the app's URL scheme and dispatches `<scheme>://` links to subscribers (queued until the first subscriber). |
| `app-config.ts` | Typed access to `app.config.json` and per-module options. |
| `preferences.ts` | Non-secret preferences (theme, window bounds) stored with `electron-store`. |
| `logger.ts` | `electron-log` set-up: log files in the platform log folder. |
| `lifecycle.ts` | Two switches modules can change: `keepRunningInBackground` and `quitting`. |
| `resources.ts` | Paths to extra resources and to bundled worker scripts. |
| `ipc/procedure.ts` | The oRPC procedure builder and its context (the calling window). |
| `ipc/core-router.ts` | Procedures every app has: `app.info`, window controls, `theme.get`/`theme.set`, `shell.openExternal`. |
| `ipc/router.ts` (*generated*) | Combines the core router with each module's router; exports the `AppRouter` type. |
| `ipc/server.ts` | Accepts `MessagePort` connections from trusted pages only (section 6.3). |
| `modules/types.ts` | The `MainModule` contract (`id`, `router`, `beforeReady`, `setup`, `dispose`). |
| `modules/registry.ts` (*generated*) | The list of enabled modules in start-up order. |
| `workers/` (optional) | Each `.ts` file becomes a separate bundle for `utilityProcess.fork`. |

### 7.3 Preload, interface and tests

The table below covers the remaining source and test files.

| File | Responsibility |
| --- | --- |
| `src/preload/preload.ts` | Forwards the one IPC `MessagePort`; exposes nothing to the page. |
| `src/renderer/main.tsx` | Interface entry: imports the global CSS, applies the saved theme, mounts React Query and the router. |
| `src/renderer/router.tsx` | TanStack Router with **hash** history (so routes work from `file://`), a layout route around home and settings, and a separate `/offline` route. |
| `src/renderer/lib/ipc.ts` | The typed IPC client `ipc`. |
| `src/renderer/lib/theme.ts` | Reads and sets the light/dark theme through IPC. |
| `src/renderer/screens/home.tsx`, `offline.tsx`, `home.test.tsx` | The home screen (shows runtime details from `ipc.app.info()`), the offline screen used by the remote and exported profiles, and a component test. |
| `src/renderer/features/types.ts`, `features/registry.ts` (*generated*) | Contract and list of module panels shown on the home screen. |
| `src/renderer/vite-env.d.ts` | Vite's client type declarations. |
| From `shared/renderer/`: `components/ui/*`, `components/app-layout.tsx`, `screens/settings.tsx`, `lib/utils.ts`, `lib/navigation.tsx`, `styles/globals.css` | Components and styles shared with the Tauri base, copied into `src/renderer/`. |
| `tests/unit/setup.ts`, `tests/unit/electron-stub.ts` | Adds DOM assertions to Vitest; a minimal fake `electron` module for unit tests. |
| `tests/e2e/app.spec.ts`, `tests/e2e/support/launch.ts` | End-to-end test of the packaged app and the launcher helper (`07-testing.md`). |

## 8. Summary

An Electron app is a privileged main process plus sandboxed renderers, connected by IPC. The generated template keeps every renderer sandboxed and isolated, exposes no Electron API to the page beyond one checked message port, flips the fuses that close the common "run as Node" and code-tampering routes, and packs the code into an integrity-checked `app.asar`. When changing any of these, read the matching section above first and record the reason in the change.
