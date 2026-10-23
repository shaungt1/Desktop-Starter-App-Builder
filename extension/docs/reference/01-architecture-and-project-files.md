# Architecture and project files

Source pages:
- https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3 (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle and https://developer.chrome.com/docs/extensions/get-started/tutorial/service-worker-events (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts, https://developer.chrome.com/docs/extensions/reference/api/action, https://developer.chrome.com/docs/extensions/reference/api/sidePanel, https://developer.chrome.com/docs/extensions/reference/api/offscreen, https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources (fetched 2026-10-23)
- https://wxt.dev/guide/essentials/project-structure.html, https://wxt.dev/guide/essentials/entrypoints.html, https://wxt.dev/guide/essentials/config/manifest.html, https://wxt.dev/guide/essentials/target-different-browsers.html, https://wxt.dev/guide/essentials/config/auto-imports.html, https://wxt.dev/guide/essentials/config/typescript.html, https://wxt.dev/guide/essentials/extension-apis.html, https://wxt.dev/guide/essentials/config/browser-startup.html (fetched 2026-10-23)
- A probe build with WXT 0.21.4 for Chrome, Edge, Firefox and Safari, and a development-mode run, on 2026-10-23 (scratch folder outside this repository)
- This repository: `extension/template/` (all files in the table of section 4), `extension/modules/`

Verified on 2026-10-23

A browser extension is a folder of ordinary web files (HTML, JavaScript, CSS, images) described by one file, `manifest.json`, which the browser reads to learn what the extension is, which parts it has and what it may do. This file explains the parts of a Manifest V3 extension, how WXT assembles them from the `entrypoints/` folder, and what every file in a generated extension is for.

## 1. The parts of a Manifest V3 extension

The list below describes each part, where it runs and what it can reach. A **context** is one of the separate places where extension code runs; each context has its own memory, so contexts cannot share variables and must send messages (`03-messaging-and-storage.md`).

1. **The manifest** (`manifest.json`). It declares the name, version, icons, permissions and the files of every other part. WXT writes it at build time (section 2); there is no `manifest.json` in the source tree.
2. **The background service worker.** A **service worker** is a script that the browser starts when an event needs it and stops when it is idle. In Chromium browsers the manifest names it with `background.service_worker`. Chrome terminates it after 30 seconds of inactivity, when a single request takes longer than 5 minutes, or when a `fetch()` response takes more than 30 seconds to arrive; an incoming event starts it again (Chrome's lifecycle page). Events and extension API calls reset the idle timer. Because Chrome states that any global variable is lost when the worker shuts down, the worker must keep no state in variables and must register its event listeners at the top level of the script, not inside an asynchronous function, so the browser can restore the handlers when the worker restarts (Chrome's service-worker events tutorial). Section 4 of `03-messaging-and-storage.md` lists the resulting pitfalls. In Firefox the same code runs as a non-persistent background page instead (`06-browsers-and-cross-browser.md`).
3. **Content scripts.** A **content script** is JavaScript that the browser injects into web pages matching a pattern. It reads and changes the page's DOM (the tree of elements) but runs in an **isolated world**, a private JavaScript environment, so it cannot see the page's own variables and the page cannot see its variables. It can use only a few extension APIs directly (`storage`, `i18n`, `runtime.sendMessage`, `runtime.connect` and a few others) and reaches the rest by messaging the service worker. A content script may instead be declared with `world: "MAIN"`, which runs it in the page's own world (`04-content-scripts-and-ui.md`).
4. **The popup.** The small window that opens when the user clicks the extension's toolbar icon. It is an HTML page named by `action.default_popup`; Chrome requires its size to be between 25x25 and 800x600 pixels. The page is created again each time it is opened (an assumption not checked against a source, **UNVERIFIED**), so state belongs in storage, not in the popup's variables. The `action.onClicked` event fires only when no popup is set (Chrome's `action` page).
5. **The options page.** An HTML page where the user changes settings, opened from the browser's extension menu or with `browser.runtime.openOptionsPage()`. WXT writes it as `options_ui` with `open_in_tab` false by default (a probe build).
6. **The side panel.** A page that stays open beside the web page. It needs the `sidePanel` permission and is available from Chrome 114; `sidePanel.open()` needs Chrome 116 or newer and must be called after a user action. The manifest key is `side_panel.default_path` (Chrome's `sidePanel` page). Firefox calls its equivalent a sidebar (`sidebar_action`).
7. **The devtools page.** An optional page that adds a panel to the browser's developer tools. WXT supports it as the `devtools` entrypoint. The template has none, and the Chrome devtools API page was not opened for this set, so no further claim is made (**UNVERIFIED**).
8. **Offscreen documents.** An **offscreen document** is a hidden page the service worker can create when it needs a browser feature that service workers lack (for example parsing HTML with `DOMParser`, playing audio or using the clipboard). It needs the `offscreen` permission and Chrome 109 or newer; an extension may have only one open at a time; only the `runtime` extension API works inside it; and `createDocument()` takes a `url` of a bundled static HTML file, a list of `reasons` and a `justification` string (Chrome's `offscreen` page). The template has none.
9. **Web-accessible resources.** Files inside the extension are private to the extension by default. The manifest key `web_accessible_resources` lists the files that web pages may load, each entry giving `resources` and at least one of `matches` or `extension_ids`. Every exposed file lets a website detect that the extension is installed and is a possible target for attacks, so expose only what a page needs and use narrow `matches` (Chrome's `web_accessible_resources` page). Content scripts do not need to be listed.

## 2. How WXT builds the extension

**WXT** (https://wxt.dev) discovers the files in `entrypoints/`, reads the options each one declares, merges them with `wxt.config.ts` and `package.json`, and writes `manifest.json` plus the bundled files to an output folder. The source tree holds no manifest.

### 2.1 Entrypoints become manifest entries

An **entrypoint** is either a single file `entrypoints/<name>.<ext>` or a folder `entrypoints/<name>/index.<ext>`; the name decides the type. Entrypoints may be nested at most one level deep, and any other file placed directly in `entrypoints/` is treated as an entrypoint, so helper files go beside `index` inside a folder entrypoint. The table below lists the entrypoint types this base uses and what WXT does with them (WXT entrypoints page, confirmed by a probe build).

| File in `entrypoints/` | Output | Manifest result |
| --- | --- | --- |
| `background.ts` | `background.js` | `background.service_worker` in Chrome and Edge; `background.scripts` in Firefox and Safari |
| `content.ts` or `content/index.ts` | `content-scripts/content.js` | one `content_scripts` entry, built from `defineContentScript` options |
| `<name>.content.ts` | `content-scripts/<name>.js` | another `content_scripts` entry |
| `popup/index.html` | `popup.html` | `action.default_popup` (`browser_action` in a Manifest V2 build); the page `<title>` becomes `default_title` |
| `options/index.html` | `options.html` | `options_ui.page` |
| `sidepanel/index.html` | `sidepanel.html` | `side_panel.default_path` plus the `sidePanel` permission in Chrome; `sidebar_action` in Firefox |
| `<name>.html` or `<name>/index.html` (any other name) | `<name>.html` | nothing; an **unlisted page** that the extension opens itself with `browser.runtime.getURL("/<name>.html")` |
| `<name>.ts` (any other name) | `<name>.js` | nothing; an **unlisted script** declared with `defineUnlistedScript` |

HTML entrypoints declare manifest options with `<meta name="manifest.<key>" content="...">` tags, for example `manifest.open_in_tab` on the options page. The options of script entrypoints are the argument of `defineBackground` and `defineContentScript`.

Two rules from WXT's documentation prevent common build errors. First, WXT loads the entrypoint file in Node while building, so browser API calls must be inside the `main` function and never at the top level of the file. Second, the `main` function of `defineBackground` must not be asynchronous, which also matches the rule that listeners be registered synchronously.

### 2.2 The manifest, permissions and version

WXT builds `manifest.json` from four inputs: the `manifest` option of `wxt.config.ts`, the options in entrypoint files, WXT modules and hooks. Properties are written in Manifest V3 form, and WXT converts them when it builds a Manifest V2 target. The behaviours below are documented on the WXT manifest page and were confirmed in a probe build.

1. **Name and version.** `name` falls back to the `name` in `package.json`. `version_name` is the exact string from `package.json` and `version` is that string cleaned to a valid manifest version, so `1.3.0-alpha2` gives `"version": "1.3.0"` and `"version_name": "1.3.0-alpha2"`.
2. **Icons.** WXT finds icons in `public/` by file name, including the folder form `public/icon/16.png`. The template uses `public/icon/` with five sizes.
3. **Permissions.** `permissions` and `host_permissions` are written in `wxt.config.ts`. WXT adds two on its own: `sidePanel` when a side-panel entrypoint exists, and, in development only, `tabs` and `scripting` (plus a `http://localhost/*` host permission and a content security policy that allows `localhost:3000`) for hot reloading. These development additions never appear in a production build.
4. **Per browser.** The `manifest` option may be a function receiving `browser`, `manifestVersion`, `mode` and `command`, which the template uses to add Firefox's `browser_specific_settings` only to Firefox builds.

### 2.3 One build folder per browser

The command `wxt build -b <browser>` writes to `.output/<browser>-mv<version>/`. WXT's default manifest version is 3 for Chrome and Edge and 2 for Firefox and Safari; `--mv2` and `--mv3` override it. The table below lists the folders a probe build with WXT 0.21.4 produced.

| Command | Output folder | Manifest version |
| --- | --- | --- |
| `wxt build` (same as `-b chrome`) | `.output/chrome-mv3` | 3 |
| `wxt build -b edge` | `.output/edge-mv3` | 3 |
| `wxt build -b firefox` | `.output/firefox-mv2` | 2 |
| `wxt build -b firefox --mv3` | `.output/firefox-mv3` | 3 |
| `wxt build -b safari` | `.output/safari-mv2` | 2 |
| `wxt` (development server, Chrome) | `.output/chrome-mv3-dev` | 3 |

The template's `build:firefox` and `zip:firefox` scripts pass no `--mv3`, so they produce Firefox **Manifest V2** builds under WXT 0.21.4. That is acceptable for Firefox, which still loads Manifest V2, but it is a decision to keep in view: the Chrome documentation states that Manifest V2 extensions no longer work in Chrome 139 and later and were removed from the Chrome Web Store on 2026-08-31, so Manifest V2 builds are for Firefox and Safari only. Edge uses the Chrome build; a separate `-b edge` build is needed only for Edge-specific features (`07-publishing-and-stores.md`).

In development, the `wxt` command starts a dev server on `http://localhost:3000`, builds the extension and, if the optional `web-ext` package is installed, opens a browser with the extension loaded (WXT's browser-startup page). The template does not list `web-ext`; in a probe run without it, WXT built `.output/chrome-mv3-dev` and printed the instruction to load that folder as an unpacked extension by hand (`AGENT_REFERENCE.md`, recipe "Run and debug"). WXT documents `web-ext.config.ts` (git-ignored, per machine) and the `webExt` key of `wxt.config.ts` for choosing browser binaries, extra Chromium arguments, a persistent profile folder, or disabling the automatic launch.

### 2.4 Configuration, aliases, auto-imports and `wxt prepare`

`wxt.config.ts` is the main configuration file. WXT's directory options are `srcDir` (default `.`, the project root), `entrypointsDir` (default `entrypoints`, relative to `srcDir`), `publicDir` (`public`), `modulesDir` (`modules`) and `outDir` (`.output`). The template keeps the defaults, so `entrypoints/` and `public/` are at the root and `src/` is an ordinary folder of the template's own code, not WXT's `srcDir`.

That has two consequences. WXT's `@` and `~` aliases point at `<srcDir>`, which is the project root, so the template's imports read `@/src/lib/messaging`, not `@/lib/messaging`. And WXT's auto-imports scan `components/`, `composables/`, `hooks/` and `utils/` under `srcDir` only, so nothing in `src/components/ui/` is auto-imported; those files are imported explicitly. WXT's own APIs (such as `defineBackground`, `defineContentScript` and `createShadowRootUi`) are auto-imported and can also be imported explicitly from `#imports`.

`wxt prepare` generates the `.wxt/` folder: `.wxt/tsconfig.json` (which the project's `tsconfig.json` extends), `.wxt/wxt.d.ts` and `.wxt/types/` (including `imports-module.d.ts`, the list of auto-imported names). The template runs it in the `postinstall` script, so editors and `tsc` recognise auto-imports after every install. The `.wxt/` folder is generated and is not edited. The `browser` object comes from `import { browser } from "wxt/browser"`; WXT uses the native `browser` global when it has a `runtime.id` and falls back to `chrome` otherwise, and APIs missing in a browser are `undefined` there, so guard calls to optional APIs with `?.`.

## 3. Optional modules

An optional module copies extra files into the extension and records the permissions it needs. In the template, `src/permissions.generated.json` holds the permissions and host permissions that `wxt.config.ts` merges into the manifest, and `src/modules/registry.ts` lists the background modules that `entrypoints/background.ts` starts. Both files are written by the builder when a module is added; they are not edited by hand. The table below lists the modules (`extension/modules/`).

| Module | Adds | Permission |
| --- | --- | --- |
| `side-panel` | `entrypoints/sidepanel/index.html`, `entrypoints/sidepanel/main.tsx`, `src/app/side-panel-screen.tsx` | `sidePanel` |
| `context-menu` | `src/modules/context-menu/background.ts` and `selection.ts`: a right-click item named "Send selection to" followed by the extension's name, shown when text is selected | `contextMenus` |
| `content-ui` | `entrypoints/overlay.content/index.tsx` and `src/modules/content-ui/overlay.tsx`: a React panel injected into pages through a shadow root | none beyond the content script's `matches` |

## 4. Every file in a generated extension

The table below lists each file or folder in a generated extension and its responsibility. The first group is the layout this base guarantees; the second group lists files that were present in `extension/template/` on 2026-10-23 and that the recipes rely on, so confirm them in the generated project before depending on them.

| Path | Responsibility |
| --- | --- |
| `wxt.config.ts` | WXT configuration: the React module, the Tailwind Vite plugin, and the `manifest` option (name, description, permissions, Firefox id). The only place a permission is added by hand. |
| `entrypoints/background.ts` | The service worker. Registers the message handlers (through `listen`) and starts the enabled modules. |
| `entrypoints/popup/index.html`, `entrypoints/popup/main.tsx` | The toolbar popup page and the script that renders `PopupScreen` into `#root`. |
| `entrypoints/options/index.html`, `entrypoints/options/main.tsx` | The options page and the script that renders `OptionsScreen`. |
| `entrypoints/content.ts` | The content script. Its `matches` list decides which sites the browser warns the user about. |
| `src/app/popup-screen.tsx`, `src/app/options-screen.tsx` | The React screens for the popup and the options page. |
| `src/components/ui/` (`button.tsx`, `card.tsx`, `switch.tsx`) | Small interface building blocks styled with Tailwind. |
| `src/lib/messaging.ts` | The typed, Zod-validated message protocol: the `messages` object, `sendMessage`, and the receiving side (`listen`, `dispatch`; section 2 of `03-messaging-and-storage.md`). |
| `src/lib/settings.ts` | Typed WXT storage items (`enabledSetting`, `greetingSetting`) with fallbacks. |
| `src/lib/utils.ts` | Shared helpers, such as the class-name merging function for Tailwind. |
| `src/styles/globals.css` | Tailwind 4 plus the theme tokens (`--background`, `--primary` and so on), defined on `:root, :host` so they also work inside a shadow root. |
| `public/icon/` | Icon PNG files of 16, 32, 48, 96 and 128 pixels. WXT finds them by name. |
| `tests/unit/*.test.ts` | Vitest unit tests. |
| `tests/e2e/extension.spec.ts` | Playwright end-to-end tests of the built extension. |
| `vitest.config.ts` | Vitest configuration with the `WxtVitest` plugin. |
| `playwright.config.ts` | Playwright configuration: test folder, timeout, one worker. |
| `biome.json` | Lint and format rules (Biome), 2-space indent and 120-column lines. |
| `tsconfig.json` | TypeScript settings; extends `.wxt/tsconfig.json`. |
| `package.json` | Name, version (which becomes the manifest `version`), dependencies and the scripts `dev`, `dev:firefox`, `build`, `build:firefox`, `zip`, `zip:firefox`, `typecheck`, `lint`, `test`, `test:e2e` and `verify`. |
| `.github/workflows/ci.yml`, `.github/workflows/release.yml` | Continuous integration and the release workflow (`05-testing.md`, `07-publishing-and-stores.md`). |
| `AGENTS.md` | Rules for AI agents working in the extension. |
| `README.md` | Human-readable overview and folder layout. |
| `docs/` | This reference set (as `docs/extension/`) and the setup notes. |
| `src/lib/use-storage-item.ts` (template, 2026-10-23) | A React hook that reads a storage item into state and keeps it current. |
| `src/lib/side-panel.ts` (template, 2026-10-23) | Opens the side panel in Chrome (`sidePanel`) or Firefox (`sidebarAction`). |
| `src/modules/registry.ts`, `src/modules/types.ts`, `src/permissions.generated.json` (template, 2026-10-23) | Module plumbing described in section 3. |
| `tests/e2e/fixtures.ts`, `tests/unit/setup.ts` (template, 2026-10-23) | The Playwright fixture that loads the extension, and the Vitest setup that resets the fake browser (`05-testing.md`). |
| `package.json` script `zip:all`, `format`, `test:watch`, `doctor` (template, 2026-10-23) | Extra scripts; `doctor` runs `scripts/doctor.mjs`, which the builder copies into every generated project together with `scripts/bootstrap.sh` and `scripts/bootstrap.ps1` (they are not in `extension/template/`). |
| `.output/`, `.wxt/` | Generated: build output and WXT's generated types. Never edited, never committed. |
