# Permissions and security

Source pages:
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/activeTab (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/reference/api/permissions (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/migrate/improve-security (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging and https://developer.chrome.com/docs/extensions/reference/api/runtime (fetched 2026-10-23)
- https://developer.chrome.com/docs/webstore/program-policies/policies, https://developer.chrome.com/docs/webstore/review-process, https://developer.chrome.com/docs/webstore/cws-dashboard-privacy (fetched 2026-10-23)
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension (fetched 2026-10-23)
- https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/ (fetched 2026-10-23; the last 3218 characters of the page were not read)
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings (fetched 2026-10-23)
- https://extensionworkshop.com/documentation/publish/source-code-submission/ (fetched 2026-10-23)
- https://developer.chrome.com/docs/webstore/using-api (fetched 2026-10-23)
- https://wxt.dev/guide/essentials/config/manifest.html and https://wxt.dev/guide/essentials/publishing.html (fetched 2026-10-23)
- A development-mode probe build with WXT 0.21.4 on 2026-10-23
- This repository: `extension/template/wxt.config.ts`, `src/lib/messaging.ts`, `AGENTS.md`

Verified on 2026-10-23

A **permission** is a power the extension asks the browser for, such as using the storage API or reading the pages the user visits. The browser shows the user a warning for some permissions when installing, and the stores review each one. This file explains the permission fields, the rules that keep an extension small and safe, and the security rules that apply to extension pages, messages and user data.

## 1. The four permission fields

The manifest has four fields that grant powers. The table below lists them (Chrome's "Declare permissions" page).

| Field | Granted | Holds |
| --- | --- | --- |
| `permissions` | At install | Names from a fixed list of API permissions, for example `storage`, `sidePanel`, `contextMenus` |
| `host_permissions` | At install | **Match patterns**, which are URL patterns such as `https://example.com/*`, naming the sites the extension may read and change |
| `optional_permissions` | At runtime, when the user agrees | The same kind of names as `permissions`, requested only when a feature needs them |
| `optional_host_permissions` | At runtime, when the user agrees | Match patterns, requested only when needed |

Host permissions are what allow `fetch()` calls from the service worker to other sites, programmatic content script injection (section 5 of `04-content-scripts-and-ui.md`), and the `cookies`, `webRequest` and `declarativeNetRequest` APIs. Some permission names produce an install warning, and the Chrome page states that adding or changing match patterns in `host_permissions` or `content_scripts.matches` also triggers a warning; users are more likely to trust an extension with few warnings. The same page recommends optional permissions wherever the feature allows.

In `wxt.config.ts` of a generated extension, `permissions` starts as `["storage"]` plus the entries of `src/permissions.generated.json` (written by the builder when a module is added), and `host_permissions` is added only when that file lists some. WXT adds a few permissions itself in development only (`01-architecture-and-project-files.md`, section 2.2); never judge the shipped permission list from the development build. Check `.output/chrome-mv3/manifest.json` after `bun run build`.

## 2. Least privilege

**Least privilege** means asking for the narrowest power that makes a feature work. It is the rule of this base, for these reasons taken from the sources: Chrome Web Store policy requires requesting "the narrowest permissions necessary" and forbids requesting a permission to "future proof" a product; Edge's publishing page says the extension must request only the minimum permissions necessary and that its reviewers check least-privilege; and the Chrome review page lists broad host permissions among the signals that prompt closer examination (section 8). The practical rules are these.

1. Prefer `activeTab` (section 3) to a host permission when the extension acts only after the user clicks it.
2. Prefer `optional_host_permissions` and `browser.permissions.request()` to `host_permissions` when the extension needs a site only for an optional feature.
3. Keep `content_scripts.matches` as narrow as the feature allows, for example `https://example.com/*`, never `<all_urls>`, `https://*/*` or `*://*/*` unless the user explicitly asks.
4. Never declare a permission "for later". Remove a permission that no code uses; both stores ask for a written justification of every permission declared in the manifest, and the Chrome dashboard tells the developer to remove an unneeded one and upload a new version.
5. Put the reason for each permission in a comment next to it in `wxt.config.ts`, so the store justification can be copied from it.

## 3. `activeTab`

`activeTab` gives the extension temporary access to the tab the user is looking at, and only after the user invokes the extension. It shows no install warning. The gestures that trigger it are clicking the extension's toolbar action, running one of its context menu items, pressing a keyboard shortcut registered with the `commands` API, and accepting an omnibox suggestion. With it, `scripting.executeScript()` and `scripting.insertCSS()` work on that tab if the `scripting` permission is also declared, and the `Tab` object exposes the URL, title and icon. Access persists while the user navigates within the same site and ends when the user goes to a different site or closes the tab. It is never granted on restricted pages such as `chrome://` pages (Chrome's `activeTab` page).

## 4. Optional permissions

A permission listed in `optional_permissions` or `optional_host_permissions` is requested from code with `browser.permissions.request()`. The Chrome reference states that the call must be made "from inside a user gesture, like a button's click handler"; that it returns a promise resolving to `true` when the user agrees; that Chrome shows a prompt only when the new permissions produce warnings the user has not already accepted; and that `permissions.contains()` checks whether the extension already holds a permission and `permissions.remove()` gives one up. The pattern is shown below.

```ts
import { browser } from "wxt/browser";

// Call this from a click handler. Declare the origin in optional_host_permissions first.
export async function enableForExample(): Promise<boolean> {
  return browser.permissions.request({ origins: ["https://example.com/*"] });
}
```

Some permissions cannot be optional: `debugger`, `declarativeNetRequest`, `devtools`, `geolocation`, `mdns`, `proxy`, `tts`, `ttsEngine` and (on ChromeOS only) `wallpaper`. To declare optional entries through WXT, add `optional_permissions` or `optional_host_permissions` to the `manifest` option of `wxt.config.ts` (WXT writes manifest properties in their Manifest V3 form). Firefox treats host permissions differently: from Firefox 127 it shows and grants Manifest V3 host permissions at install, and users can revoke any host permission at any time, so code must check with `permissions.contains()` and request again when a host permission is missing (Extension Workshop migration guide).

## 5. Content security policy for extension pages

A **content security policy** (CSP) is a rule set that tells the browser which sources of scripts a page may use. For Manifest V3 extension pages (the popup, options page, side panel and the service worker) Chrome documents the following.

1. The default policy, when the manifest sets none, is `script-src 'self'; object-src 'self';`. Scripts and objects may come only from the extension's own files; inline JavaScript does not run, string-to-code evaluation (`eval`, `new Function`) is blocked and WebAssembly is disabled.
2. The enforced minimum is `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';`. A manifest may add rules but cannot go below this minimum; relaxing `script-src` further, for example by adding `'unsafe-eval'`, makes installation fail with "Insecure CSP value".
3. In `extension_pages`, the directives `script-src`, `object-src` and `worker-src` may only use `'self'`, `'none'`, `'wasm-unsafe-eval'` and, for unpacked extensions only, localhost sources.
4. Pages listed under `sandbox` have a separate and looser policy and have no access to extension APIs. Chrome's remote-code page names a sandboxed iframe as the place where `eval` and `new Function` remain possible when no other design works.
5. Content scripts running in the isolated world use a restrictive policy that blocks `eval()` and remote scripts, and content scripts in the main world inherit the page's policy.

Firefox's Manifest V3 `script-src` likewise allows only `'self'` and `'wasm-unsafe-eval'`, and its content scripts are subject to the same policy as the rest of the extension. The template sets no `content_security_policy`, and should not: the default is the strict one. In development, WXT sets a policy that adds `http://localhost:3000` to `script-src` so hot reloading works; that policy is not in production builds.

## 6. No remotely hosted code

Manifest V3 requires that all of an extension's logic be part of the submitted package. Chrome's page states that loading and executing remote files is prohibited by Chrome Web Store policy, and that this covers JavaScript fetched from your own server, libraries served from a CDN (a content delivery network, a public host of shared files), and bundled libraries that fetch code at runtime. The Chrome store policy adds that the extension's full functionality must be "easily discernible from its submitted code" and that external resources "must not contain any logic". Edge states the same: loading and executing remotely hosted code is not permitted in Manifest V3. Obfuscation (deliberately scrambling code) is prohibited by the Chrome policy and by Firefox's add-on policy; ordinary minification is allowed.

What this means for work in this base:

1. Bundle every script and library. Do not add `<script src="https://...">` to an HTML page, do not `import()` a URL, and do not use `eval`, `new Function` or a string passed to `setTimeout`.
2. Fetching data is allowed; fetching code is not. Chrome's documented alternatives are configuration-driven logic (download JSON that switches bundled features on or off), a remote service that the extension calls, and a sandboxed iframe.
3. Choose libraries that do not load code at runtime. If one does, bundle all of its possible dynamic imports at build time.
4. When injecting a script into a tab, pass a bundled file (`files`) or a function (`func` with `args`), never a string of code.
5. On the Chrome Privacy practices tab the developer must declare whether the extension executes remote code; undeclared remote code leads to rejection.

## 7. Handling user data

Whatever the extension reads from the user, from pages or from the browser is user data. The rules below come from the Chrome Web Store policy page, the Privacy practices tab and the Firefox and Edge submission pages.

1. **Collect only what the single purpose needs.** The Chrome policy limits collecting, using or transmitting user data to what is necessary for the extension's disclosed single purpose; browsing activity may be collected only for user-facing features that are clearly described; other transfers, uses or sales of user data are prohibited, including sale for personalised ads or credit decisions.
2. **Disclose and get consent.** If the product handles any user data, the policy requires an accurate, current privacy policy, prominent disclosure of what is collected and why, and the user's affirmative and informed consent. The Chrome dashboard asks for a privacy policy URL, a certification of the data types collected, and a statement that the disclosures match the policy. Edge's Privacy page asks for the same set (single purpose, a justification of each permission, remote code, data usage certification, privacy policy URL).
3. **Firefox data declaration.** For new extensions submitted to Firefox Add-ons from 2025-11-03, the manifest must declare `browser_specific_settings.gecko.data_collection_permissions`: `required` lists data needed for operation and must contain `none` or one or more of `authenticationInfo`, `bookmarksInfo`, `browsingActivity`, `financialAndPaymentInfo`, `healthInfo`, `locationInfo`, `personalCommunications`, `personallyIdentifyingInfo`, `searchTerms`, `websiteActivity` and `websiteContent`; `optional` lists data the user can choose to provide. An extension that collects nothing declares `{ "required": ["none"] }`. The template's `wxt.config.ts` does not yet set this key (`06-browsers-and-cross-browser.md`).
4. **Keep sensitive work in the service worker** and assume any data sent to a content script might leak to the web page (Chrome's "Stay secure" page).
5. **Do not log or send page content, form values or URLs** to any server unless a described feature needs it. This base adds no analytics or telemetry.

## 8. Messages and web pages are untrusted input

A content script runs in contact with pages the extension does not control, so Chrome treats it as less trusted than the service worker. The rules below follow Chrome's messaging and "Stay secure" pages.

1. Assume a message from a content script may have been crafted by an attacker, and validate every field. The template's `src/lib/messaging.ts` does this with Zod before a handler runs and again on the response (`03-messaging-and-storage.md`).
2. Limit what a message can make the service worker do: never pass an arbitrary URL or arguments straight to an extension API.
3. For messages from another extension (`runtime.onMessageExternal`), check `sender.id` against an allow-list. For messages from web pages, use the `externally_connectable` manifest key with narrow `matches`; the template uses neither, so those listeners should not exist.
4. When identity matters, check `sender.origin` (Chrome 80 and later) and `sender.tab`, `sender.frameId` and `sender.documentId`; the Chrome runtime page notes `origin` can differ from `url`, for example for `about:blank`, and can be opaque for sandboxed iframes.
5. Avoid `innerHTML` and `document.write()` with page or network data. Create elements and set `textContent` or `innerText`. React escapes text by default; do not use `dangerouslySetInnerHTML` with untrusted data. Parse JSON with `JSON.parse`, never `eval`.
6. When the content script talks to the page with `window.postMessage`, check `event.source` and `event.origin` and treat the data as untrusted (`04-content-scripts-and-ui.md`, section 6).

## 9. Secrets

A published extension is a package that every user downloads and can unzip, so nothing in it is secret: an API key, a client secret, a token or a signing key compiled into the code is public from the first release. The rule for this base is therefore that **the extension holds no secrets**. When a feature needs a secret (a paid API, a database key), the extension calls the owner's own backend, and the backend holds the key and decides what each user may do. The only credentials that belong to the project are store-publishing credentials, and those live in the repository's secret store for the release workflow (`07-publishing-and-stores.md`), never in a file in the repository. A `.env` file can also change the hashes in a Firefox sources ZIP, so remove or exclude it before `wxt zip -b firefox` (WXT publishing page).

The account that publishes the extension is a target too: Chrome's guidance is to enable two-factor authentication on the Google account that publishes the extension, preferably with a security key, and the Chrome Web Store API documentation says 2-step verification must be enabled to publish or update an extension.

## 10. How store review treats broad permissions

The table below summarises what the sources state; it is not a prediction of an outcome.

| Source | Statement |
| --- | --- |
| Chrome review process | New developers, new extensions, dangerous permission requests and significant code changes prompt closer examination. Broad host permissions such as `<all_urls>`, `https://*/*` and `*://*/*` also do. Obfuscation is disallowed; minification is allowed but can make review harder. |
| Chrome program policy | Request the narrowest permissions necessary; do not future-proof; if the reviewer cannot determine the full functionality, the submission may be rejected or removed. |
| Chrome Privacy practices tab | Every permission in the manifest needs a written justification; unneeded permissions must be removed from the manifest and a new version uploaded. |
| Chrome update page | When an update requires additional permissions, users are prompted to accept them or disable the extension. |
| Edge publishing page | Each permission needs a justification; requesting excessive or unrelated permissions is discouraged; incomplete or inaccurate disclosures can cause additional review, delayed certification or rejection. |
| Firefox submission | A privacy policy is required if the add-on transmits data; code that is minified or built by a bundler needs a source code package (`07-publishing-and-stores.md`). |

Two consequences follow for how an agent works. Adding a permission to an already published extension makes the next update show a prompt to existing users, so adding one is a visible product decision, to be explained to the user who owns the extension. And the justification text for each permission is required at submission, so write the reason when the permission is added.
