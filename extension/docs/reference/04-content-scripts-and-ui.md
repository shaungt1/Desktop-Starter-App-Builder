# Content scripts and page UI

Source pages:
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/reference/api/scripting (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/activeTab (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources (fetched 2026-10-23)
- https://wxt.dev/guide/essentials/content-scripts.html, https://wxt.dev/guide/essentials/entrypoints.html, https://wxt.dev/guide/resources/faq.html, https://wxt.dev/guide/essentials/target-different-browsers.html, https://wxt.dev/guide/essentials/unit-testing.html (fetched 2026-10-23)
- https://tailwindcss.com/docs/compatibility (fetched 2026-10-23)
- A probe build with WXT 0.21.4 and Tailwind 4.3.3, tested with Playwright 1.64.1 on 2026-10-23 (scratch folder outside this repository)
- This repository: `extension/template/entrypoints/content.ts`, `src/styles/globals.css`, `extension/modules/content-ui/`

Verified on 2026-10-23

A **content script** is JavaScript the browser injects into web pages. This file explains how to choose which pages it runs on and when, how to show a React interface inside a page without the page's styles breaking it, how to follow navigation inside single-page applications, how to talk to the page's own scripts, and how to inject code on demand instead of on every matching page.

## 1. Match patterns and timing

### 1.1 Match patterns

A **match pattern** is a URL filter of the form `<scheme>://<host>/<path>`. The Chrome documentation defines it as follows.

1. The scheme is `http`, `https`, `*` (which matches only `http` or `https`) or `file`.
2. The host is an exact name (`www.example.com`), a subdomain wildcard (`*.example.com`) or a bare `*`. A wildcard must be the first character and must be followed by a period or a slash. Top-level-domain wildcards such as `google.*` are not supported; list `google.es` and `google.fr` separately.
3. A port is optional and means any port when omitted.
4. The path is required. For host permissions it is ignored, so `/*` is the convention.
5. `<all_urls>` matches any URL with a permitted scheme, and `*://*/*` has the same reach, so both are broad (`02-permissions-and-security.md`, sections 2 and 10).

A content script is declared with `matches` (required) and may add `excludeMatches`, `includeGlobs` and `excludeGlobs`. A script runs only if the URL matches `matches` and any include glob and does not match an exclusion. In a glob, `*` matches any string and `?` matches one character. In WXT these are options of `defineContentScript`, and `matches` may be an object keyed by browser when the targets differ.

### 1.2 `runAt`

`runAt` (`run_at` in the manifest) chooses when the script starts. `document_idle` is the default and the recommended value: the browser picks a time between `document_end` and shortly after the window's `load` event. `document_start` runs after the CSS files but before any other page script or DOM construction. `document_end` runs once the DOM is complete, before images and subframes finish loading. Use `document_start` only to act before the page runs; most scripts, including those that mount a user interface, use the default.

### 1.3 Frames and the template's script

By default a script runs only in the top frame of a tab; `allFrames: true` injects into every matching frame. The template's `entrypoints/content.ts` matches `https://example.com/*`, a placeholder that must be replaced by the sites the extension serves. It sets the attribute `data-extension-active` on the page's `<html>` element while the `enabledSetting` storage item is true and updates it when the item changes. The end-to-end test fulfils the request for that URL locally, so it needs no network.

## 2. Worlds: isolated and main

By default a content script runs in the **isolated world**: it shares the page's DOM but not its JavaScript variables, so two scripts can both declare a variable `button` without a clash, and the page cannot read the content script's values. Content scripts can call a small set of extension APIs directly and must message the service worker for the rest (`01-architecture-and-project-files.md`, section 1).

A script that must see the page's own objects (for example a function the site defines) runs in the **main world**. There are two ways in WXT, from its content-scripts page.

1. **`world: "MAIN"`** on `defineContentScript`. It works in Manifest V3 only, and a content script in the main world has no access to extension APIs. The page's content security policy applies to it.
2. **`injectScript("/example-main-world.js", { keepInDom: true })`**, which injects an unlisted script (an entrypoint named `example-main-world.ts` that uses `defineUnlistedScript`) into the page's world from a normal content script. This works in Manifest V2 and V3 and keeps an ordinary content script that can use the extension APIs as the parent. The script must be listed in `web_accessible_resources`. In Manifest V3 the injection is synchronous with `run_at`; in Manifest V2 it is asynchronous. The two sides communicate with `CustomEvent`s dispatched on the script element.

Prefer the isolated world. Code in the main world shares the page's trust level, so treat its messages as untrusted (section 6).

## 3. Injecting a React interface with a shadow root

### 3.1 Why a shadow root

If a content script appends elements to a page, the page's CSS can restyle them and the extension's CSS can restyle the page. A **shadow root** is a DOM feature that gives an element a private subtree with its own style scope, which prevents both. WXT's `createShadowRootUi` builds such a root and mounts the interface in it. The table below, from WXT's content-scripts page, compares the three ways WXT offers.

| Method | Isolated styles | Isolated events | Hot reload | Uses the page's context |
| --- | --- | --- | --- | --- |
| Integrated (`createIntegratedUi`) | No | No | No | Yes |
| Shadow root (`createShadowRootUi`) | Yes | Yes, off by default | No | Yes |
| IFrame (`createIframeUi`) | Yes | Yes | Yes | No |

`createShadowRootUi` is exported from `wxt/utils/content-script-ui/shadow-root` (listed in `wxt` 0.21.4's package exports), is auto-imported in entrypoints, and can be imported from `#imports`. It returns a promise, so `main` must be `async`, and it accepts an optional `isolateEvents` setting. In a probe build the host element was named after the `name` option (for example `<probe-ui>`) and its shadow root was open, readable from the page with `element.shadowRoot`. A shadow root therefore isolates styles and events but is not a security boundary: the page can look inside it.

### 3.2 The pattern

The module `content-ui` uses this pattern (`extension/modules/content-ui/entrypoints/overlay.content/index.tsx`). `cssInjectionMode: "ui"` makes WXT put the imported CSS into the shadow root instead of the page; `onMount` receives the container element and returns whatever `onRemove` needs; and `ui.mount()` adds it to the page.

```tsx
import { createRoot, type Root } from "react-dom/client";
import { Overlay } from "@/src/modules/content-ui/overlay";
import "@/src/styles/globals.css";

export default defineContentScript({
  matches: ["https://example.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi<Root>(ctx, {
      name: "my-extension-overlay",
      position: "inline",
      anchor: "body",
      onMount: (container) => {
        const wrapper = document.createElement("div");
        container.append(wrapper);
        const root = createRoot(wrapper);
        root.render(<Overlay />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
  },
});
```

Give `name` a hyphen, as the probe (`probe-ui`) and the module (`<slug>-overlay`) do, because the name becomes the tag of a custom element and the web platform requires custom element names to contain a hyphen; the WXT page does not state this, and what WXT does with a name that has none was not tested (**UNVERIFIED**). For an element that appears after the page loads, set `anchor` to a CSS selector and call `ui.autoMount()` instead of `mount()`; it mounts and unmounts as the element appears and disappears, and `ui.remove()` stops it.

### 3.3 Tailwind inside the shadow root

Tailwind 4 (4.3.3 in the template) generates one stylesheet from `src/styles/globals.css`. The facts below come from a probe build and from the sources named.

1. **Theme variables work.** Tailwind 4.3.3 writes its theme variables under `:root,:host`. The `:host` selector matches the shadow host, so the variables apply inside a shadow root. The template's own tokens in `globals.css` use the same selector pair for that reason. The `body { ... }` rule at the end of `globals.css` does not apply inside a shadow root, because a shadow tree has no `<body>`.
2. **Utilities render.** In a probe, a `div` with `p-4 shadow-lg ring-2 bg-brand` inside the shadow root received the expected padding, background, box shadow and ring.
3. **`rem` units follow the host page.** The `rem` unit is relative to the page's `<html>` font size, which is outside the shadow root. In the probe, a page whose `<html>` font size was 30px made `p-4` (1rem) compute to 30px padding instead of 16px. WXT's FAQ gives the fix: convert `rem` to `px` at build time with the PostCSS plugin `postcss-rem-to-responsive-pixel`. The commands and file, from the FAQ, are below. The template does not include this plugin; add it to an extension whose overlay will run on pages that change the root font size.

```bash
bun add -d postcss-rem-to-responsive-pixel
```

```bash
npm install --save-dev postcss-rem-to-responsive-pixel
```

```js
// postcss.config.mjs
import remToPx from "postcss-rem-to-responsive-pixel";

export default {
  plugins: [remToPx({ rootValue: 16, propList: ["*"], transformUnit: "px" })],
};
```

4. **`@property` rules.** The generated stylesheet also contains `@property --tw-*` rules. Whether `@property` registrations take effect for a stylesheet inside a shadow root was not confirmed from a source (**UNVERIFIED**); the probe showed shadows and rings working in Chromium, but other utilities that depend on registered initial values were not tested. After building an overlay, look at it on a real page in each browser.
5. **Dialogs, popovers and tooltips.** Components that render into `document.body` through a portal escape the shadow root and lose their styles. WXT's FAQ says to pass the shadow root's own container as the portal target (`createPortal` in React; a Radix `Portal` accepts a `container` prop, which should be checked in the installed version).
6. **Browser support.** Tailwind 4 is designed for and tested on Chrome 111, Safari 16.4 and Firefox 128 or newer (Tailwind's compatibility page).

### 3.4 Lifetime: `ctx`

The `ctx` argument tells the script whether it is still attached to a live extension. After an extension is updated, disabled or removed, old content scripts stay in open tabs and fail with "Extension context invalidated" when they call an extension API. Wrap work that outlives `main` with `ctx.addEventListener(...)`, `ctx.setTimeout(...)`, `ctx.setInterval(...)` and `ctx.requestAnimationFrame(...)`, which stop when the context is invalidated, and test `ctx.isValid` or `ctx.isInvalid` before an extension API call in a long-lived callback. The WXT FAQ lists further traps: components libraries that add styles to the page `<head>` (outside the shadow root), and, in development, content scripts that are registered dynamically so that they can reload individually (they may be missing from the development manifest; list them from the service worker console with `await chrome.scripting.getRegisteredContentScripts();`).

## 4. Pages that navigate without loading

A **single-page application** (SPA) changes the address and the page content without a full page load, so a content script that runs "on load" misses later "pages". WXT dispatches a `wxt:locationchange` event on `window`; listen for it through `ctx.addEventListener` and test the new URL against a `MatchPattern`.

```ts
const watchPattern = new MatchPattern("*://*.example.com/items/*");

export default defineContentScript({
  matches: ["*://*.example.com/*"],
  main(ctx) {
    ctx.addEventListener(window, "wxt:locationchange", ({ newUrl }) => {
      if (watchPattern.includes(newUrl)) {
        mountOverlay(ctx);
      }
    });
  },
});
```

The script is injected only on pages that match `matches`, so the pattern must cover every address the application can navigate to, while the route test inside the script decides what to do on each. Keep the host part as narrow as the application allows. `MatchPattern` is exported from `wxt/utils/match-patterns` and is also available from `#imports`.

## 5. Programmatic injection with `chrome.scripting`

A content script declared in the manifest runs on every matching page. To run code only when something happens (the user clicks the toolbar action, or a message arrives), inject it from the service worker with `browser.scripting.executeScript()`. It needs the `scripting` permission and host access, either from `host_permissions` or temporarily from `activeTab` (`02-permissions-and-security.md`, section 3). Chrome's `scripting` page documents the following.

1. `executeScript()` takes a `target` (`tabId` required; `allFrames: true`, `frameIds` or `documentIds` optional) and exactly one of `files` (an array of bundled file paths) or `func` (a function), with optional `args` and `world` (`"ISOLATED"` by default, or `"MAIN"`). It runs at `document_idle` unless `injectImmediately` is set, and resolves to an array with one result per frame, the main frame first.
2. A `func` is serialised and run in the page, so closures and bound parameters are lost and the function must be self-contained. Pass data only through `args`, which must be JSON-serialisable.
3. `insertCSS()` takes `css` or `files`; `removeCSS()` must be given the same values to undo it.
4. `registerContentScripts()` (Chrome 96 and later) registers scripts that persist across sessions, each with an `id` that must not start with an underscore. This is useful when match patterns are not known in advance. WXT can also register a content script at run time instead of in the manifest with the `registration: "runtime"` option; the WXT pages read here list the option but do not describe its use, so read the installed version's types before relying on it (**UNVERIFIED**).

A WXT-built file for programmatic injection is an **unlisted script**: create `entrypoints/inject.ts` with `defineUnlistedScript`, which builds to `inject.js`, and pass `files: ["/inject.js"]`. The code pattern is shown below.

```ts
import { browser } from "wxt/browser";

// In the background, after a user action such as the toolbar click (activeTab grants access):
browser.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return;
  await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["/inject.js"] });
});
```

Note that `action.onClicked` fires only when the extension has no popup, so this pattern needs the popup entrypoint removed and an empty `action` key in the manifest (WXT manifest page); with the template's popup, trigger injection from a message sent by the popup instead.

## 6. Talking to the page

A content script and the page's scripts share the DOM but not variables, so they cannot call each other's functions. Chrome documents `window.postMessage()` as the usual channel: the page posts a message, and the content script listens on `window`, checks `event.source` and relays the data to the service worker through the extension's messaging (`03-messaging-and-storage.md`). The rules are these.

1. Check `event.source === window` and, for messages from a specific page, `event.origin`.
2. Treat the data as untrusted: validate it with a Zod schema before acting, exactly as for a runtime message.
3. Do not forward page data straight into an extension API, and do not send secrets or extension data to the page; anything the page can receive, the site's scripts can read.
4. To send data from a main-world script injected by `injectScript`, use `CustomEvent`s on the script element as WXT documents, or `window.postMessage`.
5. Cross-origin requests belong in the background. The Extension Workshop migration guide states that Firefox Manifest V3 no longer allows cross-origin XHR and `fetch` from content scripts and says to use CORS or route the request through the background page; the same design works in Chrome, so send a message and let the service worker call `fetch`.
