# Messaging and storage

Source pages:
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/reference/api/runtime (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/reference/api/storage (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle and https://developer.chrome.com/docs/extensions/get-started/tutorial/service-worker-events (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts (fetched 2026-10-23)
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background (fetched 2026-10-23)
- https://wxt.dev/guide/essentials/messaging.html, https://wxt.dev/guide/essentials/storage.html, https://wxt.dev/storage, https://wxt.dev/guide/essentials/unit-testing.html, https://wxt.dev/guide/essentials/extension-apis.html (fetched 2026-10-23)
- `@wxt-dev/storage` 1.3.0 type definitions and `wxt` 0.21.4 package exports, read in a scratch install on 2026-10-23
- This repository: `extension/template/src/lib/messaging.ts`, `src/lib/settings.ts`, `src/lib/use-storage-item.ts`, `entrypoints/background.ts`, `tests/unit/messaging.test.ts`, `tests/unit/settings.test.ts`

Verified on 2026-10-23

The parts of an extension run in separate contexts that cannot share variables (`01-architecture-and-project-files.md`). They cooperate in two ways: by **messages**, which carry a request from one context to another, and by **storage**, which saves data in the browser where every context can read it. This file explains both, shows how the template makes messages type-safe and validated, and lists the mistakes that come from the service worker being stopped and restarted.

## 1. Runtime messaging

### 1.1 One-time requests

A **one-time request** is a single message and an optional single reply. `browser.runtime.sendMessage()` sends to the extension's own listeners (the service worker, the popup, the options page); `browser.tabs.sendMessage(tabId, message)` sends to the content scripts in one tab. Both take a JSON-serialisable value and return a promise that resolves with the reply. The receiving side registers `browser.runtime.onMessage.addListener((message, sender, sendResponse) => ...)`. The Chrome messaging page documents these rules:

1. A listener calls `sendResponse` synchronously by default. To reply later, the listener returns the literal `true`, which keeps the channel open.
2. Starting in Chrome 148 a listener may return a promise instead, and starting in Chrome 146 a thrown error or rejected promise rejects the sender's call (the error must be an `Error` instance); both roll out gradually, and `return true` works in every case.
3. An `async` listener always returns a promise, so if it returns no value the sender receives `null`, which breaks setups with several listeners. Only the first listener to respond affects the sender.
4. Chrome serialises messages as JSON (so `undefined` becomes `null`), and the maximum message size is 64 MiB.
5. The `sender` argument says who sent the message: `id`, `url`, `origin`, and, for messages from a content script, `tab`, `frameId` and `documentId` (Chrome's runtime page).

### 1.2 Long-lived connections (ports)

A **port** is a channel that stays open for many messages. `browser.runtime.connect({ name })` opens one from a content script or page to the extension, and `browser.tabs.connect(tabId, { name })` opens one from an extension page to a content script. Each end receives a `Port` with `postMessage()` and an `onMessage` event; the receiving side listens with `browser.runtime.onConnect`, filters on the port's `name`, and then listens on the port. Calling `tabs.connect()` fires `onConnect` once per frame in the tab, and `onDisconnect` can fire several times, so one disconnect does not mean the conversation is over. A port is closed by navigation, an unloaded frame, a missing `onConnect` listener or an explicit `disconnect()`. The template uses only one-time requests; add ports only when the background must push many updates to a page.

### 1.3 Other message routes

`runtime.onMessageExternal` receives messages from other extensions, and the `externally_connectable` manifest key lets listed web pages message the extension. Both are inputs from outside the extension and the template uses neither (`02-permissions-and-security.md`, section 8). Native messaging with a program installed on the computer is a separate feature that is not part of this base.

### 1.4 Libraries

WXT's messaging page recommends a wrapper package over the raw APIs and names `@webext-core/messaging`, `webext-bridge`, `trpc-chrome`, `@webext-core/proxy-service` and `Comctx`. This base does not use one; it ships a small protocol of its own on top of the raw API, described next, because its requests must be validated.

## 2. The template's typed and validated protocol

`src/lib/messaging.ts` declares every message once and derives the types from that declaration. **Zod** (the `zod` package) is a library that describes the shape of data as a schema and checks real data against it at runtime; TypeScript types disappear at runtime, so they cannot protect against a hostile message, but a Zod schema can. The pieces are listed below.

1. **The `messages` object.** Each key is a message name and holds a `request` schema and a `response` schema. The template starts with `ping`, whose request is `{ text: string (at most 200 characters) }` and whose response is `{ reply: string, receivedAt: number }`.
2. **Types.** `MessageName`, `MessageRequest<N>` (Zod's input type) and `MessageResponse<N>` (output type) come from `messages`, so a call with the wrong payload does not compile.
3. **`sendMessage(name, payload)`.** Wraps the payload in an envelope `{ name, payload }`, sends it with `browser.runtime.sendMessage`, and parses the reply with the response schema, so a bad reply throws in the caller.
4. **`listen(handlers)`.** Registers one `browser.runtime.onMessage` listener. It must be called once, synchronously, in `defineBackground`, because the browser can wake a stopped service worker only for listeners registered while it starts. The listener calls `dispatch` and returns `true` to keep the channel open.
5. **`dispatch(raw, handlers)`.** Validates the envelope, looks up the message definition and the handler, validates the request, runs the handler, validates the response and returns it. A message that is not an envelope, or whose name has no handler, resolves to `undefined`. An invalid request for a known message throws before any handler runs, and `listen` then replies with `{ error: <message> }`.

The unit tests in `tests/unit/messaging.test.ts` cover the valid path, a rejected invalid request that never reaches the handler, ignored foreign messages and a response that breaks its declared shape. Because the listener returns `true` for every message, a second `runtime.onMessage` listener registered by other code would not be the first to respond for messages in this protocol; add messages to `messages` and handle them in `listen`, not with a second listener. A proposal for handlers that need to know who sent the message (for example to accept only messages with a `sender.tab`): extend the handler signature in `dispatch` to receive the `sender` object, and check it as described in `02-permissions-and-security.md`, section 8. The template does not do this today.

Adding a message is a three-step change (`AGENT_REFERENCE.md`, recipe "Add a message type"): declare it in `messages`, add its handler to the object passed to `listen`, and call `sendMessage` where it is needed.

## 3. Storage

### 3.1 The storage areas

The `storage` permission is needed (the template declares it). The table below lists the four areas of `browser.storage` and their documented limits (Chrome's `storage` page).

| Area | Lifetime | Quota | Notes |
| --- | --- | --- | --- |
| `local` | Kept until the extension is removed | `QUOTA_BYTES` 10485760 (10 MB); the `unlimitedStorage` permission raises it | Available to content scripts by default |
| `sync` | Synced through the browser's account sync; behaves like `local` if sync is off | `QUOTA_BYTES` 102400 (about 100 KB), `QUOTA_BYTES_PER_ITEM` 8192, `MAX_ITEMS` 512, at most 120 writes per minute and 1800 per hour | A write that would exceed a limit fails immediately and rejects the promise. `set`, `remove` and `clear` count as writes. |
| `session` | Held in memory; cleared when the extension is disabled, reloaded or updated, and when the browser restarts | 10485760 bytes (it was 1 MB in Chrome 111 and earlier) | Not exposed to content scripts by default; `setAccessLevel()` with `TRUSTED_AND_UNTRUSTED_CONTEXTS` (Chrome 102 and later) exposes it |
| `managed` | Read-only, set by an administrator's policy | Not stated on the page | Available to content scripts by default |

Local and sync data survive reloads, updates and restarts. `browser.storage.onChanged` fires with `(changes, areaName)` when values change, each change having optional `oldValue` and `newValue`. The Chrome page documents no `QUOTA_BYTES` for `managed`; other browsers' limits were not checked (**UNVERIFIED**), so assume Firefox and Safari quotas can differ and keep data small. `localStorage`, the web page storage API, is not available to extension service workers (Chrome's lifecycle page), which is one more reason to use `browser.storage`.

### 3.2 WXT's storage helper

WXT bundles `@wxt-dev/storage` and exposes it as `storage`. In the template it is imported with `import { storage } from "wxt/utils/storage"`; that path is listed in `wxt` 0.21.4's package exports and builds correctly in a probe. WXT's storage page instead tells readers to import from `#imports` or use the auto-import, and does not mention the `wxt/utils/storage` path, so both forms resolve to the same library. The behaviour below is from WXT's storage pages and the library's type definitions.

1. **Keys carry the area.** Every key is written `area:name`, such as `sync:enabled` or `local:lastSelection`; the area is `local`, `session`, `sync` or `managed`. A key without the prefix throws. The `storage` permission must be in the manifest.
2. **`storage.defineItem<T>(key, options)`** returns a typed **item**. The options are `fallback` (returned instead of `null` when nothing is stored, which is how settings get defaults), `init` (a function whose result is saved at once if nothing is stored, for one-time values such as an install date), `version` (starting at 1) and `migrations` (an object keyed by target version, each function converting the previous version's value).
3. **Item methods:** `getValue()`, `setValue(value)`, `removeValue()`, `watch(callback)`, plus `getMeta`, `setMeta`, `removeMeta` and `watchMeta` for metadata stored beside the value under the key plus `$`. `watch` returns a function that stops watching; call it when the code that listens goes away, as the template's `useStorageItem` hook does.
4. **Migrations run as soon as `defineItem` is called**, and reads and writes wait for them. When an item has no stored version WXT assumes version 1. Never rename a key or change a value's shape without a new `version` and a migration, or existing users lose their settings.
5. **Bulk and whole-area operations.** `getItems`, `setItems`, `removeItems` act on several keys; `snapshot` and `restoreSnapshot` exist in the library's type definitions (the guide page does not describe them).

The template's `src/lib/settings.ts` is the single place settings are declared. `enabledSetting` is `sync:enabled` with fallback `true` and `greetingSetting` is `sync:greeting` with a default greeting. Use `sync:` for small preferences that should follow the user to another computer, `local:` for larger or device-specific data, and `session:` for data that must not survive a browser restart. In React, read an item with `useStorageItem(item)`, which returns the value (undefined until the first read) and a setter, and updates when any part of the extension changes the value.

One inconsistency in WXT's guide: its unit-testing example calls `accountStorage.deleteValue()`, but the item type in `@wxt-dev/storage` 1.3.0 has `removeValue()` and no `deleteValue`. Use `removeValue()`.

## 4. The service-worker lifecycle and how it breaks code

The service worker is started by events and stopped when idle (`01-architecture-and-project-files.md`, section 1). The mistakes below follow from that, and each has a fix.

1. **State in variables.** A module-level `let count = 0` is lost when the worker stops. Save state with a storage item.
2. **Late listener registration.** A listener added inside a promise callback, a timer or after an `await` may not exist when the browser wakes the worker for an event. Register all listeners synchronously at the top of `defineBackground`, which is what `listen()` and the module `setup()` functions do.
3. **`setTimeout` and `setInterval` for delayed work.** They are lost when the worker stops. Chrome's tutorial recommends the `alarms` API (a minimum period of 30 seconds from Chrome 120); the `alarms` API page was not opened for this set, so its permission name and signature are **UNVERIFIED** here; read that page and declare the permission before using it (the template declares none).
4. **Creating context menus at every start.** A context menu item persists; create it once in a `browser.runtime.onInstalled` listener, and handle clicks with `contextMenus.onClicked`, because the `onclick` property is not available in a service worker. Firefox's guide gives the same advice for event pages.
5. **Long requests.** A request that takes more than 5 minutes, or a `fetch()` response that takes more than 30 seconds to start, ends the worker's run. Keep background work short and resumable.
6. **Trying to keep the worker alive.** Lifetime is extended by events, extension API calls and, in newer Chrome versions, messages on an open port, WebSocket traffic and a few specific APIs. The page advises designing for unexpected termination and not keeping the worker alive unnecessarily.
7. **A message to a worker that is asleep.** An incoming event revives a dormant worker, so a send from the popup reaches a worker that had been stopped, provided the listener was registered at start-up (mistake 2). Long work inside the handler is subject to the limits in mistake 5.
8. **Testing blind spots.** Playwright keeps one worker handle across a restart; an `evaluate()` call in progress when the worker is suspended throws "Service worker restarted" (`05-testing.md`). Chrome's end-to-end testing page notes that some automation tools, such as Selenium's ChromeDriver, attach a debugger that keeps service workers from terminating, which hides lifecycle bugs.

To see the lifecycle by hand, load the extension, wait for the "service worker" link on `chrome://extensions` to read "inactive", and then use the popup: the first message must still work. Keeping DevTools open on the service worker keeps it active, so close it when testing termination (`AGENT_REFERENCE.md`, recipe "Run and debug").
