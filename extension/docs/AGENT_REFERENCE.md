# Browser extension agent reference

This reference gives an AI agent exact recipes for the most common changes in an extension generated on the browser extension base. Each recipe states where the change goes, the code pattern to follow and how to prove it works. The extension's own `AGENTS.md` lists the rules; this document shows how to follow them. The reference pages in `extension/docs/reference/` (copied to `docs/extension/` in a generated extension) explain the reasons and give the sources; a recipe names the page to read when its change touches that subject.

Verified on 2026-10-23 against WXT 0.21.4, `extension/template/` at that date, and the sources listed in the reference pages. Code patterns here were written from those sources and the template; the recipes themselves were not each run end to end, except where a recipe says "in a probe build".

## Contexts and where code runs

An extension runs code in separate places that cannot share variables. The **service worker** (`entrypoints/background.ts`) is started by events and stopped when idle, so it holds no state and registers its listeners synchronously. The **popup** (`entrypoints/popup/`), the **options page** (`entrypoints/options/`) and the optional **side panel** are ordinary React pages inside the extension; they have the full extension API. A **content script** (`entrypoints/content.ts`) runs inside web pages in an isolated world and can use only a few extension APIs directly. They talk through the typed messages in `src/lib/messaging.ts` and share saved data through the typed storage items in `src/lib/settings.ts`. Read `docs/extension/01-architecture-and-project-files.md` before working in an unfamiliar extension.

## Rules that every recipe follows

1. **Least privilege.** Add a permission or a match pattern only when a feature needs it, write the reason in a comment, and never use `<all_urls>`, `https://*/*` or `*://*/*` unless the user asks and the review cost has been explained (recipe "Add a permission").
2. **Messages are untrusted and typed.** Use `sendMessage` from `src/lib/messaging.ts`; never call `browser.runtime.sendMessage` directly.
3. **No state in the service worker's variables.** Save state with a storage item. Register every listener synchronously in `defineBackground`.
4. **No remote code and no secrets.** Bundle everything the extension runs; keep secrets on the owner's backend.
5. **Imports.** Code in `src/` is imported as `@/src/...` because WXT's `@` alias points at the project root, not at `src/`. Import the browser API as `import { browser } from "wxt/browser"` and storage as `import { storage } from "wxt/utils/storage"`.
6. **Prove every change** with `bun run verify`, and with `bun run test:e2e` when it touches an extension page, the worker, a content script, a permission or the manifest. Report a task done only when both pass and, for manifest changes, after reading the built `manifest.json`.
7. **Never publish.** Packaging is allowed; submitting to a store, pushing a `v*` tag or starting the Release workflow with `submit` needs the owner's approval each time (`docs/extension/07-publishing-and-stores.md`).

## Recipe: add a popup screen

The popup is one page. A new screen is a React component that the popup shows, chosen by state.

1. Create `src/app/<name>-screen.tsx` exporting a component. Use the components in `src/components/ui/` (`Button`, `Card`, `CardTitle`, `CardDescription`, `Switch`) and Tailwind classes. The popup's width is set by the root `<main>` class (`w-80` in `PopupScreen`); keep screens within it, because Chrome limits a popup to 800x600 pixels.
2. Read saved values with `useStorageItem(item)`, not with module-level variables.
3. Show it from `src/app/popup-screen.tsx` with a small state value, as below.

   ```tsx
   // src/app/about-screen.tsx
   import { Button } from "@/src/components/ui/button";
   import { Card, CardDescription, CardTitle } from "@/src/components/ui/card";
   import { greetingSetting } from "@/src/lib/settings";
   import { useStorageItem } from "@/src/lib/use-storage-item";

   /** A second view inside the popup. */
   export function AboutScreen({ onBack }: { onBack: () => void }) {
     const [greeting] = useStorageItem(greetingSetting);
     return (
       <section className="flex flex-col gap-3">
         <Card>
           <CardTitle>About</CardTitle>
           <CardDescription>{greeting ?? "Loading..."}</CardDescription>
         </Card>
         <Button variant="ghost" size="sm" onClick={onBack}>
           Back
         </Button>
       </section>
     );
   }
   ```

   In `PopupScreen`, add `const [view, setView] = useState<"home" | "about">("home");`, render `<AboutScreen onBack={() => setView("home")} />` when `view === "about"`, and add a button that calls `setView("about")`.
4. Prove it: add `tests/unit/about-screen.test.tsx` that starts with `// @vitest-environment jsdom`, renders the component with `@testing-library/react`, and clicks with `@testing-library/user-event`, following `tests/unit/popup-screen.test.tsx` (mock `@/src/lib/messaging` if the screen sends a message). Then run `bun run verify`, and `bun run test:e2e` after adding a Playwright step that opens `chrome-extension://${extensionId}/popup.html` and clicks the new button (`tests/e2e/extension.spec.ts` shows the shape).

## Recipe: add an options setting (a typed storage item)

1. Declare the item in `src/lib/settings.ts`. Keys are `area:name`; use `sync:` for small preferences that should follow the user, `local:` for larger or device-only data. Always give a `fallback` and a `version`, because the shape of a stored value cannot change later without a migration.

   ```ts
   /** How many entries the popup lists. */
   export const itemLimitSetting = storage.defineItem<number>("sync:itemLimit", {
     fallback: 10,
     version: 1,
   });
   ```

2. Edit it on the options page (`src/app/options-screen.tsx`) and read it wherever it is needed, with the hook in React or `await itemLimitSetting.getValue()` elsewhere. Validate user input before saving.

   ```tsx
   const [limit, setLimit] = useStorageItem(itemLimitSetting);
   // inside the Card:
   <label className="flex flex-col gap-1 text-sm font-medium">
     Entries to show
     <input
       type="number"
       min={1}
       max={50}
       className="h-9 rounded-md border border-input bg-background px-3 text-sm font-normal"
       value={limit ?? 10}
       onChange={(event) => void setLimit(Math.min(50, Math.max(1, Math.trunc(Number(event.target.value)) || 10)))}
     />
   </label>
   ```

3. To change the shape of an existing item later, raise `version` and add a migration; do not rename the key: `version: 2, migrations: { 2: (old: number) => ({ count: old }) }` (the type argument changes with it). WXT runs migrations when `defineItem` is called.
4. Prove it: add a case to `tests/unit/settings.test.ts` that reads the fallback, writes a value and watches for the change (the in-memory browser is reset before each test). Then `bun run verify`. If the setting changes behaviour on pages, extend `tests/e2e/extension.spec.ts` following the test "a setting saved on the options page is visible in the popup".

## Recipe: add a message type

Read `docs/extension/03-messaging-and-storage.md`, section 2, first. A message is declared once; the types, the validation of the request and the validation of the response all come from that one declaration.

1. Add an entry to `messages` in `src/lib/messaging.ts`, with Zod schemas. Bound every string and array, because the sender may be a content script on a hostile page.

   ```ts
   export const messages = {
     ping: { /* unchanged */ },
     countWords: {
       request: z.object({ text: z.string().min(1).max(5000) }),
       response: z.object({ words: z.number().int().nonnegative() }),
     },
   } as const;
   ```

2. Add its handler to the object passed to `listen` in `entrypoints/background.ts`. The handler receives the validated request and returns the response (or a promise of it). Keep the listener registration where it is, at the top of `defineBackground`.

   ```ts
   listen({
     ping: ({ text }) => ({ reply: `Background received: ${text}`, receivedAt: Date.now() }),
     countWords: ({ text }) => ({ words: text.split(/\s+/u).filter(Boolean).length }),
   });
   ```

3. Call it from the popup, options page, side panel or a content script:

   ```ts
   const { words } = await sendMessage("countWords", { text });
   ```

4. Do not add a second `browser.runtime.onMessage` listener for this protocol: the template's listener replies to every message and Chrome delivers only the first reply to the sender. If a handler needs to know who sent the message, change `dispatch` to pass the `sender` and check `sender.tab`, `sender.origin` or `sender.id` as appropriate (`docs/extension/02-permissions-and-security.md`, section 8).
5. Prove it: add tests to `tests/unit/messaging.test.ts` that call `dispatch({ name: "countWords", payload: ... }, handlers)` with a valid payload, with an invalid payload (expect a rejection and that the handler never ran) and with a response that breaks the schema. Then `bun run verify`.

## Recipe: add a content script

1. Decide the narrowest `matches` that does the job, for example `https://example.com/articles/*`. A new pattern adds an install warning and a review question (`docs/extension/04-content-scripts-and-ui.md`, section 1).
2. Create `entrypoints/<name>.content.ts`; WXT builds it to `content-scripts/<name>.js` and adds a `content_scripts` entry.

   ```ts
   import { enabledSetting } from "@/src/lib/settings";

   export default defineContentScript({
     matches: ["https://example.com/articles/*"],
     runAt: "document_idle",
     async main(ctx) {
       if (!(await enabledSetting.getValue())) {
         return;
       }
       const heading = document.querySelector("h1");
       if (heading) {
         heading.dataset.extensionSeen = "true";
       }
       ctx.addEventListener(window, "wxt:locationchange", () => {
         // re-run for single-page applications that change the address without reloading
       });
     },
   });
   ```

3. Rules for the code: put all DOM and browser calls inside `main`; never write page text with `innerHTML`; send anything that needs extension privileges to the service worker with `sendMessage`; use `ctx.addEventListener`, `ctx.setTimeout` and similar so work stops when the extension is updated.
4. Prove it: `bun run build`, then read `.output/chrome-mv3/manifest.json` and confirm a `content_scripts` entry with exactly the intended `matches` and no new `host_permissions`. Add a Playwright test that answers the page itself so no network is needed, as the existing content-script test does:

   ```ts
   test("the content script marks article pages", async ({ context }) => {
     await context.route("https://example.com/**", (route) =>
       route.fulfill({ contentType: "text/html", body: "<!doctype html><h1>Title</h1>" }),
     );
     const page = await context.newPage();
     await page.goto("https://example.com/articles/1");
     await expect(page.locator("h1")).toHaveAttribute("data-extension-seen", "true");
   });
   ```

   Then `bun run test:e2e`.

## Recipe: add a permission

Read `docs/extension/02-permissions-and-security.md` first. Every permission is shown to users or checked by reviewers, and each store asks for a written reason.

1. Prefer a narrower alternative. The table below lists the usual substitutions.

   | Instead of | Use |
   | --- | --- |
   | Host access to every site (`<all_urls>`, `https://*/*`) | `activeTab` when the extension acts after the user clicks it; otherwise `optional_host_permissions` requested with `browser.permissions.request()` from a click handler; otherwise the specific host |
   | A permission for a feature that is not built yet | Nothing: add it when the feature is built |
   | Permanent access for a feature few users use | An optional permission |

2. Add it to the `permissions` array in `wxt.config.ts`, never to `src/permissions.generated.json` (the builder rewrites that file), with the reason beside it:

   ```ts
   permissions: [
     "storage",
     "activeTab", // act on the page the user is looking at, after the user clicks the extension
     ...generated.permissions,
   ],
   ```

   A host access that must be granted at install goes in `host_permissions`; one that is requested later goes in `optional_host_permissions`. The `manifest` option is a function, so entries can differ per browser with its `browser` argument.
3. Prove it: `bun run build` and `bun run build:firefox`, then read `permissions` and `host_permissions` in `.output/chrome-mv3/manifest.json` and `.output/firefox-mv2/manifest.json`. They must contain the new entry and nothing else new. (The development build adds `tabs`, `scripting` and a localhost host permission by itself; never judge the list from it.) Run `bun run test:e2e`.
4. Tell the owner: the next update shows existing users a prompt to accept the new permission or disable the extension, and the store dashboards will ask for a justification (copy the comment).

## Recipe: add a context-menu item

The `context-menu` module does this; add it with the builder, from the builder repository: `bash start.sh module add context-menu <path to the extension>` (the command the extension's `AGENTS.md` names). To write one by hand, or to add a second item:

1. Add `"contextMenus"` to `permissions` in `wxt.config.ts` (recipe "Add a permission"). Firefox accepts the same name as an alias of its `menus` permission.
2. Create `src/lib/menus.ts` with a testable click handler and a registration function:

   ```ts
   import { browser } from "wxt/browser";

   const SEARCH_ID = "search-selection";

   /** Handles a click. Kept separate from the listener so a unit test can call it. */
   export async function handleMenuClick(info: { menuItemId: string | number; selectionText?: string }): Promise<void> {
     if (info.menuItemId === SEARCH_ID && info.selectionText) {
       const query = encodeURIComponent(info.selectionText.trim().slice(0, 200));
       await browser.tabs.create({ url: `https://example.com/search?q=${query}` });
     }
   }

   /** Call this synchronously inside defineBackground. */
   export function registerMenus(): void {
     // Menu items persist, so create them once when the extension is installed or updated.
     browser.runtime.onInstalled.addListener(() => {
       browser.contextMenus.create({ id: SEARCH_ID, title: "Search for '%s'", contexts: ["selection"] });
     });
     // Handle clicks with an event listener: the onclick property does not work in a service worker.
     browser.contextMenus.onClicked.addListener((info) => {
       void handleMenuClick(info);
     });
   }
   ```

3. Call `registerMenus()` inside `defineBackground` in `entrypoints/background.ts`, next to `listen(...)`. Do not edit `src/modules/registry.ts`; it is generated.
4. Selected text comes from any web page: bound it and encode it, as above.
5. Prove it: a unit test of `handleMenuClick` with a fake `info`; `bun run verify`; then by hand, load the build, select text on a page and right-click: the item must appear. A context menu is browser UI and is not covered by the Playwright setup in the template.

## Recipe: add a side panel

The `side-panel` module does this: `bash start.sh module add side-panel <path to the extension>`. By hand:

1. Create `entrypoints/sidepanel/index.html` (same shape as `entrypoints/popup/index.html`) and `entrypoints/sidepanel/main.tsx` that renders `SidePanelScreen` from `src/app/side-panel-screen.tsx` into `#root`, importing `@/src/styles/globals.css`.
2. Write the screen in `src/app/side-panel-screen.tsx` with the same components and hooks as the popup. A side panel stays open while the user browses, so subscribe to storage with `useStorageItem` rather than reading once.
3. WXT adds the `sidePanel` permission and the `side_panel.default_path` key for Chrome and Edge, and writes `sidebar_action` for Firefox. In a probe build the Chrome manifest contained `"permissions": ["storage","sidePanel"]` and `"side_panel": {"default_path": "sidepanel.html"}`, and the Firefox manifest contained `"sidebar_action": {"default_panel": "sidepanel.html", ...}`. The Safari build had no side-panel key.
4. To open it, use `openSidePanel()` from `src/lib/side-panel.ts` inside a click handler (the popup's "Open side panel" button does). Chrome requires `sidePanel.open()` to follow a user action.
5. Prove it: `bun run build` and `bun run build:firefox`; confirm the keys above in the two manifests; add a Playwright test that opens `chrome-extension://${extensionId}/sidepanel.html` and checks its content; run `bun run verify` and `bun run test:e2e`. Check the real side panel by hand in Chrome (the toolbar icon opens the popup, whose button opens the panel).

## Recipe: add a content-script UI

The `content-ui` module does this: `bash start.sh module add content-ui <path to the extension>`. By hand, follow `docs/extension/04-content-scripts-and-ui.md`, section 3:

1. Create `entrypoints/overlay.content/index.tsx` with `cssInjectionMode: "ui"` and `createShadowRootUi`, importing `@/src/styles/globals.css`; set `matches` to the narrowest list. The code pattern is in that section and in `extension/modules/content-ui/entrypoints/overlay.content/index.tsx`.
2. Create the React component in `src/modules/<id>/` or `src/app/`, using Tailwind classes and `src/components/ui/`. Use a `z-index` high enough to sit above the page (the module uses `z-[2147483647]`).
3. The component runs in a shadow root, so page CSS does not reach it. If the pages you target change their root font size, add the PostCSS plugin described in section 3.3 of that page, because Tailwind's `rem` units follow the host page.
4. Dialogs and popovers that render through a portal must be given the shadow root's container as their target, or they lose their styles.
5. Prove it: a unit test of the component with `// @vitest-environment jsdom`; `bun run build` and a check that `manifest.json` has the new `content_scripts` entry; then a Playwright test that serves the page with `context.route`, waits for the host element (named after the `name` option) and reads inside its shadow root, as in this probe-tested pattern:

   ```ts
   await page.waitForSelector("my-extension-overlay", { state: "attached" });
   const text = await page.evaluate(() => document.querySelector("my-extension-overlay")?.shadowRoot?.textContent ?? "");
   expect(text).toContain("expected text");
   ```

   Finally look at the panel on a real matching page in Chrome and Firefox.

## Recipe: bump the version and build the ZIP files

1. Change `version` in `package.json` (for example `1.0.0` to `1.0.1`); it must be larger than the version already in the stores and must be one to four dot-separated integers (`docs/extension/07-publishing-and-stores.md`, section 2). Do not edit a version in any generated file.
2. Run the gates, then build the ZIP files:

   ```bash
   bun run verify
   bun run test:e2e
   bun run zip:all
   ```

   ```bash
   npm run verify
   npm run test:e2e
   npm run zip:all
   ```

3. Check the result. The ZIP files are in `.output/` and are named `<name>-<version>-chrome.zip`, `<name>-<version>-firefox.zip` and `<name>-<version>-sources.zip` (names from a probe build). Print the built manifest versions:

   ```bash
   node -p "require('./.output/chrome-mv3/manifest.json').version"
   node -p "require('./.output/firefox-mv2/manifest.json').version"
   ```

4. For Firefox, extract `<name>-<version>-sources.zip` into an empty folder, run `bun install` and `bun run zip:firefox` there, and confirm the build succeeds. Make sure the README in the project says how a reviewer builds it.
5. Stop and hand over: give the owner the ZIP paths, the version, the permission list from the manifest and the changes since the last version. Submission is the owner's decision.

## Recipe: run the tests

The table below gives the command for each purpose.

| Purpose | Command |
| --- | --- |
| Everything that must pass before a change is finished | `bun run verify` (type check, lint and format check, unit tests) |
| Unit tests only, once | `bun run test` |
| Unit tests while editing | `bun run test:watch` |
| Fix formatting and import order | `bun run format` |
| Build, then drive the real extension in Chromium | `bun run test:e2e` |
| One end-to-end file | `bun run build` then `bunx playwright test tests/e2e/extension.spec.ts` |

The npm equivalents are `npm run <script>` and `npx playwright test ...`. After changing source, always rebuild before running Playwright directly, because the tests load `.output/chrome-mv3`. If Playwright reports that its browser is missing, run `bunx playwright install chromium` (the `test:e2e` script runs the same step first). Linux CI needs `playwright install --with-deps chromium` for system libraries; headless runs need no virtual display (`docs/extension/05-testing.md`).

## Recipe: run and debug

### Load the extension by hand in Chrome or Edge

1. Run `bun run build` (production build) or `bun run dev` (development build).
2. Open `chrome://extensions` (Edge: `edge://extensions`) and turn on Developer mode.
3. Choose Load unpacked and select `.output/chrome-mv3` (development: `.output/chrome-mv3-dev`).
4. Pin the extension to the toolbar from the puzzle-piece menu; clicking its icon opens the popup.

### Development mode

`bun run dev` starts WXT's dev server on `http://localhost:3000` and builds `.output/chrome-mv3-dev`. WXT opens a browser with the extension loaded only when the optional `web-ext` package is installed; the template does not list it, and in a probe run without it WXT printed `Load ".output\chrome-mv3-dev" as an unpacked extension manually`. To get the automatic browser, add it with `bun add -d web-ext` (npm: `npm install --save-dev web-ext`) and, if needed, configure `web-ext.config.ts` (`docs/extension/01-architecture-and-project-files.md`, section 2.3); otherwise load the folder yourself and use the reload rules below (whether a hand-loaded development build reloads itself when files change was not checked, **UNVERIFIED**). Never upload or zip a development build.

### Inspect each part

1. **Service worker.** On `chrome://extensions`, the extension's card shows a "service worker" link; after the worker has been idle it reads "(inactive)". Click it to open DevTools for the worker (this wakes it, and keeping DevTools open keeps it alive; close DevTools to test that the extension survives a stopped worker). Read stored data in its console with `await chrome.storage.local.get()` (and `chrome.storage.sync.get()`).
2. **Popup, options page, side panel.** Open the page, right-click it and choose Inspect. The options page and the side panel can also be opened as normal tabs at `chrome-extension://<id>/options.html` and `/sidepanel.html`; the id is on the extension's card.
3. **Content script.** Its `console.log` output appears in the web page's DevTools console, not in the worker's.
4. **Errors.** In Chrome an Errors button appears on the extension's card when something throws; in Edge the card shows an Error link and the management page has a Clear errors button.

### Reload after a change

The table below, from Chrome's tutorial, says what needs the extension reloaded (the circular arrow on its card).

| Changed | Reload needed |
| --- | --- |
| `manifest.json` (so `wxt.config.ts`, permissions, entrypoint options) | Yes |
| The service worker | Yes |
| A content script | Yes, and reload the web page |
| Popup, options page, other extension HTML pages | No; reopen the page |

After a reload that changes content scripts, refresh the web page too (Microsoft's sideloading page says the refresh is sometimes required in Edge).

### Firefox

Run `bun run build:firefox`, open `about:debugging`, choose "This Firefox", "Load Temporary Add-on" and select a file in `.output/firefox-mv2`; choose "Reload" after changes. The add-on stays until Firefox restarts. With `web-ext` installed, `bun run dev:firefox` does this automatically.

## Facts that prevent common mistakes

1. WXT builds Firefox as Manifest V2 unless `--mv3` is passed, so `.output/firefox-mv2` is the Firefox folder with the template's scripts.
2. `entrypoints/` and `public/` are at the project root, `src/` is the template's own code folder, and the alias `@` means the project root: write `@/src/lib/settings`.
3. Browser API calls and DOM calls at the top level of an entrypoint file run in Node during the build and fail; put them inside `main`. The `main` of `defineBackground` must not be `async`.
4. Storage keys need the area prefix (`sync:`, `local:`, `session:`, `managed:`), and `sync` is limited to about 100 KB, 8192 bytes per item and 120 writes per minute.
5. Chrome's testing page says to open a popup either with `action.openPopup()` where the test tool supports it or by loading its URL in a tab; the template's tests load `chrome-extension://<id>/popup.html` as a page.
6. Firefox needs `browser_specific_settings.gecko.id` (and, for new submissions, `data_collection_permissions`) in the manifest; the template sets only the id, as a placeholder to replace.
7. `bun run dev` does not open a browser unless `web-ext` is installed.
8. Playwright can load extensions only in its bundled Chromium, and only through a persistent context; Chrome and Edge no longer accept the side-loading flags.
9. A change that adds a permission or a match pattern reaches existing users as a prompt; do not add one casually.
