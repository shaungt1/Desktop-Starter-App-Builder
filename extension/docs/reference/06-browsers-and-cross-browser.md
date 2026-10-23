# Browsers and cross-browser builds

Source pages:
- https://wxt.dev/guide/essentials/target-different-browsers.html, https://wxt.dev/guide/essentials/config/manifest.html, https://wxt.dev/guide/essentials/entrypoints.html, https://wxt.dev/guide/essentials/extension-apis.html, https://wxt.dev/guide/essentials/publishing.html, https://wxt.dev/guide/essentials/config/browser-startup.html (fetched 2026-10-23)
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension, https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support, https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading (fetched 2026-10-23)
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings, https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background, https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action, https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus, https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Differences_between_API_implementations (fetched 2026-10-23)
- https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/ (fetched 2026-10-23; the last 3218 characters of the page were not read) and https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/ (fetched 2026-10-23)
- https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari, https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect, https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension, https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline (fetched 2026-10-23)
- A probe build with WXT 0.21.4 for Chrome, Edge, Firefox (Manifest V2 and V3) and Safari on 2026-10-23
- This repository: `extension/template/wxt.config.ts`, `package.json`, `src/lib/side-panel.ts`

Verified on 2026-10-23

The same source code builds for four browser families. This file explains what they share, what differs, what the template does for each and what it still leaves to the developer.

## 1. Summary of the four targets

The table below compares the targets as they behave with WXT 0.21.4 and the template. The cells come from the sources and the probe build cited above.

| | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| WXT command | `wxt build` | `wxt build -b edge` (or reuse the Chrome build) | `wxt build -b firefox` | `wxt build -b safari` |
| Output folder | `.output/chrome-mv3` | `.output/edge-mv3` | `.output/firefox-mv2` (`--mv3`: `.output/firefox-mv3`) | `.output/safari-mv2` |
| Default manifest version | 3 | 3 | 2 | 2 |
| Background | Service worker | Service worker | Scripts, run as a non-persistent background page | Scripts or service worker |
| Side surface | `side_panel` and the `sidePanel` permission | Same as Chrome (Edge lists `sidePanel` as supported) | `sidebar_action` | None: the probe's Safari manifest had no side-panel key |
| Extension namespace | `chrome` (and `browser` from Chrome 148) | Same as Chrome | `browser` | Not stated on the pages read; WXT's `browser` covers it |
| Test with Playwright | Yes (bundled Chromium) | No (Playwright uses its own Chromium) | No | No |
| Needs a developer account to try | No | No | No | Not to try unsigned; yes to distribute |

## 2. Chrome and Edge

Edge is built on the Chromium engine, and Microsoft's porting page states that the extension APIs and manifest keys supported by Chrome are code-compatible with Edge, that porting takes minimal changes, and that extensions using APIs Edge does not support might not port directly. The supported-API page lists `action`, `alarms`, `contextMenus`, `offscreen`, `permissions`, `scripting`, `sidePanel` and `storage` as supported in Manifest V3 and lists as unsupported, among others, `identity.getAuthToken`, `identity.getAccounts`, `gcm` and `readingList`. For a Chrome extension to be accepted by Edge's certification, the page says to remove the `update_url` field from the manifest and to rebrand the extension if "Chrome" appears in its name or description. WXT's publishing page says that no separate Edge ZIP is needed when the Chrome ZIP is also published; a separate `wxt zip -b edge` is only for Edge-specific features.

To try the build by hand in Edge: open the extensions page, switch on Developer mode, choose Load unpacked, and select `.output/chrome-mv3` (Microsoft's sideloading page); use Reload on the extension's card after a change and refresh the web page, which the page says is sometimes required. In Chrome the equivalent steps are in `AGENT_REFERENCE.md`, recipe "Run and debug".

Chrome 148 and later also expose the `browser` namespace; Chrome's `chrome.*` callbacks are still supported, and promise versions of the asynchronous methods exist for Manifest V3. The template imports `browser` from `wxt/browser`, so its code does not depend on which global the browser provides.

## 3. Firefox

### 3.1 What differs from Chrome

The list below collects the differences that matter to this base, from MDN and the Extension Workshop migration guide.

1. **Background.** Firefox does not support `background.service_worker`; it uses `background.scripts` (or `page`) and runs them as a **non-persistent background page** (also called an event page), which is stopped when idle and restarted when an event arrives. In-memory values are lost on unload while listener registrations persist, so the same rules apply as for a service worker: keep no state in variables and register listeners at the top level. WXT writes the right key for each browser from the single `entrypoints/background.ts`. Firefox 120 and earlier did not start the background page when `service_worker` was present; from Firefox 121 it does. Non-persistent pages work from Firefox 106.
2. **Extension id.** An add-on id is required to publish: set `browser_specific_settings.gecko.id` in the manifest. For Manifest V3, Firefox does not assign one at signing, so it must be set. The id is either an email-like string of at most 80 characters matching `^[a-zA-Z0-9-._]*@[a-zA-Z0-9-._]+$` (for example `@my-extension`) or a GUID in braces. The template writes `__APP_SLUG__@__APP_ID__` for Firefox builds only; replace it with an id the owner controls before the first upload, because AMO checks that the id is unique when an add-on is signed for the first time. `wxt submit` reads the same id from `FIREFOX_EXTENSION_ID` (`07-publishing-and-stores.md`).
3. **Data declaration.** For new extensions submitted to Firefox Add-ons from 2025-11-03, `browser_specific_settings.gecko.data_collection_permissions` is mandatory (`02-permissions-and-security.md`, section 7). The template's `wxt.config.ts` does not set it. For an extension that collects and transmits nothing, add `data_collection_permissions: { required: ["none"] }` next to `id` inside `gecko`.
4. **Side surface.** Firefox's `sidebar_action` takes `default_panel`, `default_title`, `default_icon` and `open_at_install` (default true, so the sidebar opens when installation completes). WXT turns a `sidepanel` entrypoint into `sidebar_action` for Firefox, as the probe build confirmed. The template's `src/lib/side-panel.ts` calls `browser.sidebarAction.open()` in Firefox and `browser.sidePanel.open({ windowId })` in Chrome; whether Firefox requires `sidebarAction.open()` to be called from a user action was not confirmed on the pages read (**UNVERIFIED**), and the template calls it from a button click.
5. **Context menus.** The Firefox API is `menus`; `contextMenus` is accepted as an alias for both the permission name and the API (`browser.contextMenus`). Menus are created in a `runtime.onInstalled` listener in event pages and in all Chrome extensions, and clicks are handled with `onClicked`, not an `onclick` property, which throws in event pages.
6. **Host permissions.** From Firefox 127 the install prompt shows and grants `host_permissions` and content-script hosts; before 127 they were not granted at install. Users can revoke any host permission at any time, so check with `permissions.contains()` and request again when needed. Host permissions added in an update are not shown to users (a bug reference on the Extension Workshop page).
7. **Promises and namespace.** Firefox exposes `browser.*` with promises; WXT's `browser` from `wxt/browser` papers over the difference.
8. **Manifest keys and APIs.** Firefox keeps `page_action` while Chromium merges it into `action`; `web_accessible_resources` does not support `use_dynamic_url`; `browser_style` is unsupported in Manifest V3; the `userScripts` API differs from Chrome's and AMO approves its use only for user script managers; `protocol_handlers` and `contextualIdentities` are Firefox-only. A content script with `cssInjectionMode: "ui"` (the `content-ui` module) makes WXT list its stylesheet as a web-accessible resource. In the probe, the Chrome build listed it with the script's `matches` and `use_dynamic_url: true`, the Firefox Manifest V3 build listed it with the script's `matches` and no `use_dynamic_url`, and the Firefox and Safari Manifest V2 builds listed it as a bare path (`["content-scripts/content.css"]`), which Manifest V2 makes loadable by any web page. That exposure only lets a site detect the extension; it is a reason to prefer a Manifest V3 build for Firefox.
9. **Content security policy.** Firefox Manifest V3 allows only `'self'` and `'wasm-unsafe-eval'` in `script-src`, and content scripts are subject to the same policy as the rest of the extension.
10. **Cross-origin requests.** Cross-origin XHR and `fetch` from content scripts are no longer allowed in Firefox Manifest V3; route them through the background.

### 3.2 Which Manifest V3 features lag

The MDN page "Browser support for JavaScript APIs" lists API names but its compatibility tables did not load in the fetched text, so this set cannot state, per API, whether Firefox supports the `sidePanel` or `offscreen` APIs that Chrome and Edge support (**UNVERIFIED**). The safe rule is the one the Extension Workshop gives for partial APIs: treat every browser-specific API as possibly absent, feature-detect it (`browser.offscreen?.createDocument`) and provide a fallback. WXT's types are based on `@types/chrome`, assume every API exists and omit Firefox-only APIs such as `sidebarAction`, so the type checker will not warn about a missing one; the template's `side-panel.ts` handles this by casting `browser` to a small interface and checking for each property at run time.

### 3.3 Manifest version for Firefox builds

WXT 0.21.4 builds Firefox as Manifest V2 unless `--mv3` is passed, and the template's `build:firefox`, `dev:firefox` and `zip:firefox` scripts pass none. Both are valid for Firefox: Firefox supports Manifest V3 from version 109, and the Chrome store no longer accepts Manifest V2, but Firefox still loads it. The decision is the owner's and should be recorded in the project's README: Manifest V2 keeps one codebase running with persistent background behaviour on Firefox; Manifest V3 (`wxt build -b firefox --mv3`, folder `.output/firefox-mv3`) matches Chrome's model. Whether AMO plans to stop accepting Manifest V2 was not found on the pages read (**UNVERIFIED**). To switch, change the three scripts to pass `--mv3`; then the `zip:firefox` artifact comes from the MV3 build.

### 3.4 Trying a Firefox build

Run `bun run build:firefox`, open `about:debugging` in Firefox, choose "This Firefox", "Load Temporary Add-on", and select a file inside `.output/firefox-mv2` (or the packaged ZIP). Use "Reload" on the entry after a change; it restarts background scripts and re-reads `manifest.json`. The add-on stays until Firefox restarts (Extension Workshop). With the optional `web-ext` package installed, `bun run dev:firefox` opens Firefox with the extension loaded and reloads it on file changes (WXT's browser-startup page).

## 4. Safari

### 4.1 What is needed

Safari runs web extensions only inside a native app. Apple's pages state the following.

1. A Safari web extension is distributed in a macOS, iOS, visionOS or Mac Catalyst app. The extension and its containing app must be signed to distribute securely through the App Store, which requires membership in the Apple Developer Program.
2. Apple's tool for wrapping a web extension in an app is the **Safari web extension packager**. On a Mac, it is the command `xcrun safari-web-extension-packager <path>`, which creates an Xcode project containing an app (macOS, iOS or both) and a Safari web extension target holding the extension files. Its options include `--project-location`, `--app-name`, `--bundle-identifier`, `--swift` or `--objc`, `--ios-only` or `--macos-only`, `--copy-resources`, `--no-open`, `--no-prompt`, `--force` and `--rebuild-project` (to add iOS to an existing macOS project). If unsure which language to choose, Apple suggests Swift. The packager prints a warning listing manifest keys the installed Safari does not support.
3. The same packager is available as a web tool in App Store Connect, which Apple says works from any browser "without requiring a Mac or access to Xcode": create an app record, open Users and Access, Xcode Cloud tab, Safari Web Extension Packager, upload the extension files, then distribute through TestFlight or submit for App Store review.
4. Some older guides call the tool `safari-web-extension-converter`. Apple's page at the old address (`.../converting-a-web-extension-for-safari`) now shows the article "Packaging a web extension for Safari", which documents `safari-web-extension-packager`, and WXT's publishing page also uses the packager name. Whether the old command name still runs was not checked (**UNVERIFIED**); use the packager name.

### 4.2 How WXT fits

WXT builds `-b safari` into `.output/safari-mv2` (a Manifest V2 build by default, as the probe confirmed; `--mv3` gives a Manifest V3 folder). WXT's publishing page says Safari is not supported yet, that Safari requires a native macOS or iOS wrapper which WXT does not create, and that the build output folder, not the source folder, is what the packager takes. The route is therefore: the template defines no Safari script, so type `bunx wxt build -b safari` (npm: `npx wxt build -b safari`), then run the packager on a Mac against `.output/safari-mv2` or use the App Store Connect tool with the folder's files. This end-to-end route was not run for this set because it needs macOS and an Apple account (**UNVERIFIED**).

### 4.3 Trying a build without signing

On a Mac, Apple describes a temporary install that needs no Xcode project: in Safari choose Settings, Developer tab, "Add Temporary Extension...", and select the folder or ZIP. Safari removes temporary extensions after 24 hours or when Safari quits, and the "Allow unsigned extensions" option resets whenever Safari quits. For iOS, run the containing app from Xcode on a simulator or device. Distribution outside the Mac App Store is possible for macOS with a Developer ID signature and notarization (Apple's distribution page).

## 5. What the template does and what it leaves to the developer

The table below lists the cross-browser work in the template and the gaps found while writing this set.

| Item | Template state on 2026-10-23 |
| --- | --- |
| One source, two build scripts (`build`, `build:firefox`) | Present |
| Firefox `gecko.id` | Placeholder `__APP_SLUG__@__APP_ID__`, replaced by the owner |
| Firefox `data_collection_permissions` | Not set; required for new Firefox submissions since 2025-11-03 |
| Firefox manifest version | MV2 by WXT default; decision to record |
| Edge | Reuses the Chrome build; no `build:edge` script |
| Safari | No script; needs a Mac or App Store Connect, an Apple Developer account and the packager |
| Cross-browser test automation | Chromium only (`05-testing.md`) |
