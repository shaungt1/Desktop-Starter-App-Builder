# Testing

Source pages:
- https://wxt.dev/guide/essentials/unit-testing.html and https://wxt.dev/guide/essentials/e2e-testing.html (fetched 2026-10-23)
- https://playwright.dev/docs/chrome-extensions and https://playwright.dev/docs/ci (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world and https://developer.chrome.com/docs/extensions/get-started/tutorial/service-worker-events (fetched 2026-10-23)
- https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/ (fetched 2026-10-23)
- A probe extension built with WXT 0.21.4 and tested with `@playwright/test` 1.64.1 and its bundled Chromium, headless, on Windows, on 2026-10-23 (scratch folder outside this repository)
- This repository: `extension/template/package.json`, `vitest.config.ts`, `playwright.config.ts`, `tests/unit/setup.ts`, `tests/unit/messaging.test.ts`, `tests/unit/settings.test.ts`, `tests/unit/popup-screen.test.tsx`, `tests/e2e/fixtures.ts`, `tests/e2e/extension.spec.ts`, `.github/workflows/ci.yml`
- `npm view` for `vitest` (5.0.5) and `@playwright/test` (1.64.1); `gh api repos/<owner>/<repo>/releases/latest` for the GitHub Action versions

Verified on 2026-10-23

A generated extension has two layers of automated tests. **Unit tests** check one piece of logic at a time, quickly, with a fake copy of the browser's extension APIs. **End-to-end tests** load the real built extension into a real browser and drive its pages like a user. This file explains how each layer is set up, how to write new tests, how to run them in continuous integration (CI, an automated build-and-test run on a server), and what no automated test can do.

## 1. Commands

The table below lists the test commands in the template's `package.json`. Each is run from the extension's folder; the npm form is `npm run <script>`.

| Command | What it runs |
| --- | --- |
| `bun run test` | `vitest run`: every unit test once. |
| `bun run test:watch` | `vitest`: unit tests, re-run on each file change. |
| `bun run typecheck` | `tsc --noEmit`. |
| `bun run lint` | `biome check .`. |
| `bun run verify` | `typecheck`, then `lint`, then `test`. The quality gate before every commit. |
| `bun run test:e2e` | `wxt build && playwright install chromium && playwright test`: builds `.output/chrome-mv3`, makes sure Playwright's Chromium is installed, then runs the browser tests. |

## 2. Unit tests with Vitest

**Vitest** (5.0.5) is a test runner that shares Vite's configuration. WXT's Vitest plugin, `WxtVitest` from `wxt/testing/vitest-plugin`, prepares the environment so that code written for an extension runs in a test. From WXT's unit-testing page, the plugin provides these things.

1. **An in-memory `browser`.** It is built on `@webext-core/fake-browser` and imported as `fakeBrowser` from `wxt/testing/fake-browser`. Storage is implemented in memory, so `browser.storage` and everything built on it, including `wxt/utils/storage`, works without mocks.
2. **Your Vite settings.** It applies the Vite configuration and plugins from `wxt.config.ts`.
3. **Auto-imports,** when enabled.
4. **Global values** such as `import.meta.env.BROWSER` and `import.meta.env.MANIFEST_VERSION`.
5. **Aliases** such as `@` and `@@`, so imports resolve as they do in the build.

The template's `vitest.config.ts` runs files matching `src/**/*.test.{ts,tsx}` and `tests/unit/**/*.test.{ts,tsx}`, enables Vitest globals, turns CSS processing off, and loads `tests/unit/setup.ts`. The setup file imports `@testing-library/jest-dom/vitest` (matchers such as `toBeInTheDocument()`) and calls `fakeBrowser.reset()` before each test, so every test starts with empty storage and no registered listeners. A test file that renders React components starts with the comment `// @vitest-environment jsdom`, which switches that file from Node to **jsdom**, a simulated browser document.

Three kinds of unit test appear in the template. A storage test reads and writes the typed items and watches them (`tests/unit/settings.test.ts`):

```ts
import { describe, expect, test } from "vitest";
import { enabledSetting } from "@/src/lib/settings";

describe("settings", () => {
  test("have fallbacks, so reading never returns null", async () => {
    expect(await enabledSetting.getValue()).toBe(true);
  });
});
```

A protocol test calls `dispatch` directly, with no browser at all, to prove that an invalid request is rejected before any handler runs (`tests/unit/messaging.test.ts`). A screen test renders a React screen with `vi.mock("@/src/lib/messaging", ...)` replacing `sendMessage`, so no service worker is needed (`tests/unit/popup-screen.test.tsx`). Two rules from WXT's page apply when mocking: mock the real module path (`wxt/utils/inject-script`), not `#imports`, and run `wxt prepare` if `.wxt/types/imports-module.d.ts`, which lists the real paths, does not exist. Keep logic that needs testing in functions that take their inputs as arguments, as `dispatch` does; they can then be tested without any browser fake.

## 3. End-to-end tests with Playwright

### 3.1 What Playwright documents for extensions

**Playwright** (`@playwright/test` 1.64.1) is a browser-automation and test framework. Its "Chrome extensions" page states the following.

1. Extensions work only in Chromium, and only when launched with a **persistent context** (a browser started with a user-data folder, so that extensions load). Playwright cannot test extensions in Firefox or WebKit.
2. Google Chrome and Microsoft Edge no longer support the command-line flags needed to side-load an extension, so tests use the Chromium that Playwright bundles. The extension is loaded with `--disable-extensions-except=<path>` and `--load-extension=<path>`, both pointing at the build folder. Custom browser arguments are used at your own risk, since some may break Playwright.
3. **Headless works** with the `chromium` channel: Playwright's page says the `chromium` channel lets you run extensions in headless mode, and you can also run headed. Chrome's own testing page says the new headless mode, started with `--headless=new`, is required because the old default headless mode does not load extensions. Whether Playwright's channel passes that flag itself was not checked (**UNVERIFIED**); no extra flag was needed in the probe.
4. For a Manifest V3 extension, `context.serviceWorkers()` returns the worker if it is already running, and `context.waitForEvent("serviceworker")` waits for it otherwise. The extension id is the host part of the worker's URL: `serviceWorker.url().split("/")[2]`.
5. Extension pages are opened by URL. With the id in a variable called `extensionId`, the popup is `chrome-extension://${extensionId}/popup.html` (a template string passed to `page.goto`), and the options page is `chrome-extension://${extensionId}/options.html`. WXT writes both files at the root of the build folder.
6. Chrome suspends a Manifest V3 service worker after about 30 seconds of inactivity and restarts it on demand. Playwright keeps the same `Worker` handle across the restart, and calls made during the restart wait; an `evaluate()` call that is running when the worker is suspended throws "Service worker restarted".

In a probe build on Windows, the loop worked as documented: a persistent context with `channel: "chromium"` and the two flags loaded `.output/chrome-mv3` in headless mode, the service-worker event fired, the id was read from the worker URL, and `chrome-extension://<id>/popup.html` and `/options.html` rendered and passed assertions. The same flow on Linux and macOS was not run for this set (**UNVERIFIED** there).

### 3.2 The template's fixture and tests

`tests/e2e/fixtures.ts` extends Playwright's `test` with two fixtures, shown below in shortened form. `context` launches the persistent context with an empty user-data folder (a temporary one) and closes it afterwards; `extensionId` waits for the service worker and extracts the id.

```ts
export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent("serviceworker");
    await use(worker.url().split("/")[2] ?? "");
  },
});
```

`playwright.config.ts` sets `testDir: "tests/e2e"`, a 60-second test timeout, one worker, one retry and the `github` reporter on CI, and the `list` reporter otherwise. The template's three tests are listed below.

1. The popup's button sends the `ping` message and the popup shows the reply, proving the popup, the messaging protocol and the service worker work together.
2. A greeting saved on the options page appears in the popup, proving storage is shared.
3. The content script marks a matching page: the test answers the request for `https://example.com/` itself with `context.route(...)`, so it needs no network, and expects the `data-extension-active` attribute on `<html>`.

To add a test, follow the same shape: open an extension page by URL, act with role-based locators (`getByRole`, `getByLabel`), and assert on visible results. Chrome's testing page adds two tips. Test what users see rather than internal state; when you must read state, run code in the service worker with `worker.evaluate(...)` and return the value. And if a popup depends on the active tab, make it accept an explicit tab id (for example a `tab` URL parameter) so a test can open the popup page as a normal tab.

### 3.3 Rules for e2e tests

1. **Build first.** The tests load `.output/chrome-mv3`, which is the previous build until `wxt build` runs again. Use `bun run test:e2e`, not bare `playwright test`, after changing source.
2. **One worker.** The template runs a single worker. The `context` fixture is created per test (an empty user-data folder is passed to `launchPersistentContext`), and with one worker only one such browser runs at a time.
3. **No real accounts, no live sites.** Intercept page requests with `context.route(...)` and keep fixtures in the test.
4. **Do not wait with fixed pauses.** Use Playwright's web-first assertions (`expect(locator).toHaveText(...)`), which retry.
5. **Only Chromium is tested.** Firefox and Safari builds are checked by building them and, for Firefox, by loading them by hand (`06-browsers-and-cross-browser.md`).

## 4. Continuous integration

The template's `.github/workflows/ci.yml` has two jobs. `verify` runs on Windows, macOS and Linux and executes `bun install --frozen-lockfile`, `bun run verify`, then `bun run build` and `bun run build:firefox` to prove both browser builds still compile. `e2e` runs on `ubuntu-latest`, installs Chromium with its system libraries (`bunx playwright install --with-deps chromium`) and runs `bun run test:e2e`. The workflow uses `actions/checkout@v7`, `oven-sh/setup-bun@v2` and `actions/setup-node@v7`; on 2026-10-23 the newest releases are `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0 and `oven-sh/setup-bun` v2.2.0.

On Linux, **Xvfb** is a virtual display that draws in memory so that programs which need a screen can run on a server with none. Playwright's CI page states that headed execution (a visible browser window) needs Xvfb on Linux agents, that its Docker image and GitHub Action ship with it, and that the command is `xvfb-run npx playwright test`. Because the template launches the bundled Chromium through `channel: "chromium"` without `headless: false`, the tests run headless and need no Xvfb. If a test must be headed (for example to record a video of a headed browser), wrap the command as `xvfb-run -a bun run test:e2e` and install `xvfb` with `sudo apt-get install -y xvfb`. Windows and macOS runners have a display.

## 5. What cannot be automated

The list below names the checks that need a person or a manual step.

1. **Store review.** Each store's reviewers decide whether to accept an upload; there is no test for it (`07-publishing-and-stores.md`).
2. **Real sign-in flows.** An end-to-end test must not use a real account or real credentials. Test the extension against a stubbed or local backend, and keep real-account checks as a manual release step.
3. **Firefox and Safari behaviour.** Playwright drives only Chromium for extensions. To try a Firefox build by hand: open `about:debugging`, choose "This Firefox", "Load Temporary Add-on", and select a file in `.output/firefox-mv2` (or `.output/firefox-mv3`); use "Reload" after a change; the add-on stays until Firefox restarts. Safari needs a Mac (`06-browsers-and-cross-browser.md`).
4. **Browser-native prompts.** Install warnings and the prompt shown by `browser.permissions.request()` belong to the browser, not the page; whether Playwright can answer them was not tested (**UNVERIFIED**). Test the code on either side of the prompt and check the prompt by hand.
5. **Visual fit on real sites.** An overlay injected into a third-party page is checked by looking at it on that page in each browser (`04-content-scripts-and-ui.md`, section 3.3).

## 6. When to run which tests

Run `bun run verify` after every change. Run `bun run test:e2e` as well whenever a change touches the popup, the options page, the background worker, a content script, a permission or the manifest. Run `bun run build` and `bun run build:firefox` before a release, and read the generated `manifest.json` in each output folder. Every new feature ships unit tests for its logic and, where it has a user flow in an extension page, an end-to-end test in `tests/e2e/`.
