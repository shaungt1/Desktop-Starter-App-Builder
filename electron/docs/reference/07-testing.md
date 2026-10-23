# Testing

Source pages:
- electron/electron docs folder, commit `c80c71c7c6b1` (2026-10-22): `docs/tutorial/automated-testing.md` (section "Using Playwright"), `docs/tutorial/testing-on-headless-ci.md`, `docs/tutorial/fuses.md`
- https://playwright.dev/docs/api/class-electron (fetched 2026-10-22)
- This repository: `electron/template/package.json`, `vitest.config.mts`, `playwright.config.ts`, `tests/unit/setup.ts`, `tests/unit/electron-stub.ts`, `tests/e2e/app.spec.ts`, `tests/e2e/support/launch.ts`, `src/main/security.test.ts`, `src/renderer/screens/home.test.tsx`, `forge.config.ts`, `AGENTS.md`; `electron/profiles/exported/tests/e2e/app.spec.ts`; `.github/workflows/ci.yml`; `docs/TESTING.md`
- `npm view` for `vitest` (5.0.5), `@playwright/test` (1.64.1), `electron-playwright-helpers` (3.1.2)

Verified on 2026-10-22

A generated Electron app has two layers of automated tests. **Unit tests** check one piece of logic at a time, quickly, without starting Electron. **End-to-end tests** start the real, packaged app and drive its window like a user would. This file explains how both are set up in the template, how to write new ones, and how to run the end-to-end tests on a Linux machine that has no screen. It extends the Electron section of `docs/TESTING.md`.

## 1. Commands

The table below lists the test commands defined in the template's `package.json`. Each is run from the app's folder; the npm form is `npm run <script>`.

| Command | What it runs |
| --- | --- |
| `bun run test` | `vitest run`: every unit test once. |
| `bun run test:watch` | `vitest`: unit tests, re-run on each file change. |
| `bun run verify` | `typecheck`, then `lint`, then `test`. The quality gate before every commit. |
| `bun run test:e2e` | `electron-forge package && playwright test`: packages the app into `out/`, then runs the Playwright tests against it. |

## 2. Unit tests with Vitest

**Vitest** (5.0.5 in the template) is a test runner that shares Vite's configuration and transforms. `vitest.config.mts` sets it up as described in the list below.

1. **Which files.** `src/**/*.test.{ts,tsx}` and `tests/unit/**/*.test.{ts,tsx}`; tests live next to the code they test.
2. **Environment.** The default environment is `node`, which suits main-process logic. A component test opts into **jsdom** (a simulated browser document) by starting with the comment `// @vitest-environment jsdom`, as `src/renderer/screens/home.test.tsx` does.
3. **The `electron` module.** Electron's APIs exist only inside a running Electron process, so `electron` is aliased to `tests/unit/electron-stub.ts`. The stub provides `vi.fn()` fakes for `app`, `shell`, `safeStorage`, `nativeTheme`, `ipcMain`, `dialog`, `BrowserWindow` and `Notification`. A test that needs other behaviour overrides it with `vi.mock("electron", ...)`.
4. **Assertions.** `tests/unit/setup.ts` imports `@testing-library/jest-dom/vitest`, which adds matchers such as `toBeInTheDocument()` and `toHaveTextContent()`.
5. **Aliases.** `@` resolves to `src/renderer`, matching the interface code.

The two kinds of unit test in the template are shown below. The first tests pure main-process logic (`src/main/security.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { isTrustedUrl } from "./security";

describe("isTrustedUrl", () => {
  it("rejects look-alike hosts", () => {
    expect(isTrustedUrl("https://app.example.com.evil.net", ["https://app.example.com"])).toBe(false);
  });
});
```

The second renders a screen with the IPC client replaced by a mock, so no main process is needed (`src/renderer/screens/home.test.tsx`, shortened):

```tsx
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HomePage } from "./home";

vi.mock("@/lib/ipc", () => ({
  ipc: { app: { info: vi.fn(async () => ({ version: "1.2.3", /* other fields */ })) } },
}));

it("shows the version from the main process", async () => {
  render(<QueryClientProvider client={new QueryClient()}><HomePage /></QueryClientProvider>);
  expect(await screen.findByTestId("app-version")).toHaveTextContent("1.2.3");
});
```

Keep main-process logic that needs testing in functions that take their inputs as arguments (as `isTrustedUrl` and the exported profile's `exportCandidates` do); they can then be tested in Node without any Electron fake.

## 3. End-to-end tests with Playwright

### 3.1 Playwright's Electron support

**Playwright** (`@playwright/test` 1.64.1 in the template) is a browser-automation and test framework. Its `_electron` object launches an Electron app and returns an `ElectronApplication`, from which `firstWindow()` returns the first window as a Playwright `Page`. Playwright's documentation describes Electron support as **experimental** and lists Electron **v21+** as supported. The list below gives the `electron.launch()` options most relevant here.

- `args`: arguments passed to Electron, "typically the main script name". The template passes the path of the packaged `app.asar`.
- `executablePath`: the Electron executable; defaults to the development Electron binary in `node_modules`.
- `cwd`, `env` (defaults to `process.env`), `timeout` (start-up limit, default 30000 ms).
- Browser-context options such as `colorScheme`, `locale`, `offline`, `recordVideo`, `tracesDir` and `artifactsDir`.

`ElectronApplication.evaluate()` runs a function in the **main process**, receiving the `electron` module; the Electron docs' example reads `app.isPackaged` this way.

### 3.2 Why the template launches `app.asar` with the development binary

Playwright's documentation lists a known issue: if launching times out, make sure the `EnableNodeCliInspectArguments` fuse is not set to `false`. The template sets that fuse to `false` in packaged builds (`01-architecture-and-project-files.md`, section 4), so Playwright cannot drive the packaged *executable*. `tests/e2e/support/launch.ts` therefore uses `electron-playwright-helpers` (3.1.2) to find the newest build in `out/` (`findLatestBuild()` and `parseElectronApp()`) and passes that build's `resources/app.asar` as the argument to the development Electron binary. The test thus runs the exact packaged code, including `.vite/build` output and extra resources, with an unfused executable. On Linux, when the test runs as the root user (common in containers), the helper adds `--no-sandbox`, because Chromium refuses to run its sandbox as root.

### 3.3 The template's tests

`playwright.config.ts` sets `testDir: "tests/e2e"`, a 60-second test timeout, one worker (one app at a time), one retry and the `github` reporter when the `CI` environment variable is set, and the `list` reporter otherwise. The native profile's test (`tests/e2e/app.spec.ts`) opens the first window and checks that the `<h1>` shows the app name and that the element with test ID `app-version` shows the version, which proves the IPC bridge works. The exported profile replaces it with a test that the window's URL matches `^app://bundle/`.

A new end-to-end test follows the same shape, shown below. Always close the app in `finally`, so a failing assertion does not leave Electron running.

```ts
import { expect, test } from "@playwright/test";
import { launchPackagedApp } from "./support/launch";

test("opens settings", async () => {
  const app = await launchPackagedApp();
  try {
    const window = await app.firstWindow();
    await window.getByRole("link", { name: "Settings" }).click();
    await expect(window).toHaveURL(/#\/settings$/u);
  } finally {
    await app.close();
  }
});
```

The link name and URL in this example assume the template's navigation labels and hash routing; check the layout component for the exact label. Because `test:e2e` packages first, re-run the whole script after changing source code; running only `playwright test` would test the previous package.

## 4. Running headless on Linux

Electron, being based on Chromium, needs a display server; without one it fails to start and no test runs (`testing-on-headless-ci.md`). The Electron docs' answer is **Xvfb**, a virtual display that performs all drawing in memory, with `DISPLAY` pointing at it. The `xvfb-run` command starts Xvfb, sets `DISPLAY` and runs a command inside it; `-a` picks a free display number. The commands below install it and run the tests (Debian or Ubuntu).

```bash
sudo apt-get install -y xvfb
xvfb-run -a bun run test:e2e
```

```bash
xvfb-run -a npm run test:e2e
```

On GitHub Actions, add the same two steps to an `ubuntu-latest` job, as in the job below. Windows and macOS runners have a display and need no wrapper. The builder's own CI additionally wraps the run in `dbus-run-session` (with the `dbus-x11` package), which provides a session message bus for desktop integrations; add it if a module's test needs one.

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: sudo apt-get update && sudo apt-get install -y xvfb
      - run: bun install --frozen-lockfile
      - run: xvfb-run -a bun run test:e2e
```

## 5. When to run which tests

`AGENTS.md` in the generated app sets the rule, restated here. Run `bun run verify` after every change. Run `bun run test:e2e` as well when the change affects start-up, windows, IPC, packaging or a module's user flow. Every new module ships unit tests for its logic and, where it has a user flow, an end-to-end test in `tests/e2e/`.
